/** D7 (§9): Daily Line Telegram alerts — card live, unpicked nudge, settled.
 *  Runs on a 5-min interval in the worker. Sends DMs via TMA bot.
 *  Dedup via gl_alerts_sent table — restart-safe, never double-sends. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

// ── Types ───────────────────────────────────────────────────────────────────

type AlertKind = 'card_live' | 'nudge' | 'settled';

interface GlUser {
  id: string;
  auth_ref: string;   // Telegram user id (chat_id for DM)
  display_name: string;
}

interface GlCard {
  id: string;
  card_number: number;
  goal_line: number;
  cutoff_time_utc: string;
  status: string;
  settlement_result: string | null;
}

interface GlPick {
  user_id: string;
  side: string;
  net_profit: number | null;
  points_added: number | null;
}

interface Deps {
  db: SupabaseClient;
  tmaBotToken: string;
  siteUrl: string;
}

// ── Telegram send ───────────────────────────────────────────────────────────

async function sendDM(
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: object,
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { description?: string };
      // 403 = bot blocked by user → disable alerts
      if (res.status === 403) return false;
      log.warn(`dl-alerts: sendDM ${chatId} HTTP ${res.status}: ${data.description ?? ''}`);
    }
    return res.ok;
  } catch (err) {
    log.warn('dl-alerts: sendDM failed', err);
    return false;
  }
}

function tmaButton(siteUrl: string) {
  return {
    inline_keyboard: [[{
      text: '🎯 Open Daily Line',
      web_app: { url: `${siteUrl}/tma/daily-line` },
    }]],
  };
}

// ── Dedup helpers ───────────────────────────────────────────────────────────

async function alreadySent(db: SupabaseClient, cardId: string, userId: string, kind: AlertKind): Promise<boolean> {
  const { data } = await db
    .from('gl_alerts_sent')
    .select('id')
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .eq('kind', kind)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function markSent(db: SupabaseClient, cardId: string, userId: string, kind: AlertKind) {
  await db.from('gl_alerts_sent').upsert(
    { card_id: cardId, user_id: visibleId(userId), kind },
    { onConflict: 'card_id,user_id,kind' },
  );
}

function visibleId(id: string) { return id; }

// ── Eligible users ──────────────────────────────────────────────────────────

async function getTgUsers(db: SupabaseClient): Promise<GlUser[]> {
  const { data, error } = await db
    .from('gl_users')
    .select('id, auth_ref, display_name')
    .eq('auth_provider', 'telegram')
    .eq('tg_alerts', true)
    .not('auth_ref', 'is', null);
  if (error) { log.warn('dl-alerts: getTgUsers error', error.message); return []; }
  return (data ?? []) as GlUser[];
}

async function disableAlerts(db: SupabaseClient, userId: string) {
  await db.from('gl_users').update({ tg_alerts: false }).eq('id', userId);
  log.info(`dl-alerts: disabled tg_alerts for user ${userId} (bot blocked)`);
}

// ── Alert A1: Card live ─────────────────────────────────────────────────────

async function alertCardLive(deps: Deps, card: GlCard) {
  const users = await getTgUsers(deps.db);
  if (!users.length) return;

  const cutoff = new Date(card.cutoff_time_utc);
  const cutoffStr = cutoff.toISOString().slice(11, 16) + ' UTC';
  const text = `🎯 <b>Card #${card.card_number} is open!</b>\n\nGoal Line: <b>${card.goal_line}</b>\nPick before <b>${cutoffStr}</b>`;

  let sent = 0;
  for (const user of users) {
    if (await alreadySent(deps.db, card.id, user.id, 'card_live')) continue;
    const ok = await sendDM(deps.tmaBotToken, user.auth_ref, text, tmaButton(deps.siteUrl));
    if (!ok) { await disableAlerts(deps.db, user.id); continue; }
    await markSent(deps.db, card.id, user.id, 'card_live');
    sent++;
  }
  if (sent > 0) log.info(`dl-alerts: card_live #${card.card_number} → ${sent} users`);
}

// ── Alert A2: Unpicked nudge (cutoff − 60 min) ─────────────────────────────

async function alertNudge(deps: Deps, card: GlCard) {
  const cutoff = new Date(card.cutoff_time_utc).getTime();
  const now = Date.now();
  const minsLeft = (cutoff - now) / 60_000;
  // Fire between 55-65 min before cutoff (5-min interval tolerance)
  if (minsLeft > 65 || minsLeft < 0) return;

  const users = await getTgUsers(deps.db);
  if (!users.length) return;

  // Get users who already picked
  const { data: picks } = await deps.db
    .from('gl_picks')
    .select('user_id')
    .eq('daily_card_id', card.id);
  const pickedUserIds = new Set((picks ?? []).map((p: { user_id: string }) => p.user_id));

  const text = `⏰ <b>1h left on Card #${card.card_number}!</b>\n\nYou haven't picked yet — Over or Under ${card.goal_line}?`;

  let sent = 0;
  for (const user of users) {
    if (pickedUserIds.has(user.id)) continue;
    if (await alreadySent(deps.db, card.id, user.id, 'nudge')) continue;
    const ok = await sendDM(deps.tmaBotToken, user.auth_ref, text, tmaButton(deps.siteUrl));
    if (!ok) { await disableAlerts(deps.db, user.id); continue; }
    await markSent(deps.db, card.id, user.id, 'nudge');
    sent++;
  }
  if (sent > 0) log.info(`dl-alerts: nudge #${card.card_number} → ${sent} users`);
}

// ── Alert A3: Settled ───────────────────────────────────────────────────────

async function alertSettled(deps: Deps, card: GlCard) {
  if (!card.settlement_result) return;

  // Only users who picked on this card
  const { data: picks } = await deps.db
    .from('gl_picks')
    .select('user_id, side, net_profit, points_added')
    .eq('daily_card_id', card.id);
  if (!picks?.length) return;

  const users = await getTgUsers(deps.db);
  if (!users.length) return;
  const userMap = new Map(users.map(u => [u.id, u]));

  let sent = 0;
  for (const pick of picks as GlPick[]) {
    const user = userMap.get(pick.user_id);
    if (!user) continue;
    if (await alreadySent(deps.db, card.id, user.id, 'settled')) continue;

    const won = pick.side === card.settlement_result;
    const pts = pick.points_added ?? pick.net_profit ?? 0;
    const ptsStr = pts >= 0 ? `+${pts}` : String(pts);
    const emoji = won ? '🎉' : '😤';
    const text = `${emoji} <b>Card #${card.card_number} settled: ${card.settlement_result!.toUpperCase()}</b>\n\nYou picked <b>${pick.side.toUpperCase()}</b> — ${won ? 'WIN' : 'LOSS'} (${ptsStr} pts)`;

    const ok = await sendDM(deps.tmaBotToken, user.auth_ref, text, tmaButton(deps.siteUrl));
    if (!ok) { await disableAlerts(deps.db, user.id); continue; }
    await markSent(deps.db, card.id, user.id, 'settled');
    sent++;
  }
  if (sent > 0) log.info(`dl-alerts: settled #${card.card_number} → ${sent} users`);
}

// ── Main tick (called every 5 min from index.ts) ────────────────────────────

export async function runDailyLineAlerts(deps: Deps) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch today's card(s)
    const { data: cards, error } = await deps.db
      .from('gl_daily_cards')
      .select('id, card_number, goal_line, cutoff_time_utc, status, settlement_result')
      .eq('utc_date', today);
    if (error) { log.warn('dl-alerts: fetch cards error', error.message); return; }

    for (const card of (cards ?? []) as GlCard[]) {
      // A1: card just opened → send to all TG users
      if (card.status === 'open') {
        await alertCardLive(deps, card);
        await alertNudge(deps, card);
      }
      // A3: card settled → send results to pickers
      if (card.status === 'settled') {
        await alertSettled(deps, card);
      }
    }
  } catch (err) {
    log.warn('dl-alerts: tick failed', err);
  }
}
