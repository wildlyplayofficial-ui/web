/** R5+R6+R9: Daily Line health monitor — alerts Telegram on issues. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { drainFailures, formatFailureAlert } from './job-tracker';
import { log } from './log';

const ALERT_CHAT_ID = '-5152855985';
const DEDUP_TTL = 2 * 60 * 60 * 1000; // 2h

const alerted = new Map<string, number>();

function pruneAlerted() {
  const now = Date.now();
  for (const [key, ts] of alerted) {
    if (now - ts > DEDUP_TTL) alerted.delete(key);
  }
}

async function sendAlert(botToken: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ALERT_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    log.warn('dl-monitor: sendAlert failed', err);
  }
}

async function alert(botToken: string, key: string, text: string) {
  if (alerted.has(key)) return;
  alerted.set(key, Date.now());
  log.warn(`dl-monitor alert: ${text}`);
  await sendAlert(botToken, text);
}

interface Deps {
  db: SupabaseClient;
  botToken: string;
  lastCronSuccess: { ts: number };
}

export async function checkDailyLineHealth({ db, botToken, lastCronSuccess }: Deps) {
  pruneAlerted();

  // 1. Stale live cards — all matches finished but card still 'live'
  try {
    const { data: liveCards } = await db
      .from('gl_daily_cards')
      .select('id, card_number')
      .eq('status', 'live');

    for (const card of (liveCards ?? []) as { id: string; card_number: number }[]) {
      const { data: junctions } = await db
        .from('gl_daily_card_matches')
        .select('match_id')
        .eq('daily_card_id', card.id);
      if (!junctions?.length) continue;

      const matchIds = (junctions as { match_id: string }[]).map((j) => j.match_id);
      const { data: matches } = await db
        .from('gl_matches')
        .select('status')
        .in('id', matchIds);
      if (!matches?.length) continue;

      const allFinished = (matches as { status: string }[]).every(
        (m) => m.status === 'finished',
      );
      if (allFinished) {
        await alert(botToken, `stale-live-${card.id}`,
          `⚠️ Card #${card.card_number} has all matches finished but is still 'live' — settlement may have failed`);
      }
    }
  } catch (err) { log.warn('dl-monitor: stale-live check failed', err); }

  // 2. Missing scores — kickoff >3h ago but still 'scheduled'
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: stale } = await db
      .from('gl_matches')
      .select('id, home_team, away_team')
      .eq('status', 'scheduled')
      .lt('kickoff_time_utc', threeHoursAgo);

    for (const m of (stale ?? []) as { id: string; home_team: string; away_team: string }[]) {
      await alert(botToken, `missing-score-${m.id}`,
        `⚠️ Match ${m.home_team} vs ${m.away_team} kickoff was 3h+ ago but status still 'scheduled' — livescore may not be syncing`);
    }
  } catch (err) { log.warn('dl-monitor: missing-scores check failed', err); }

  // 3. Cron health — last successful run >20 min ago
  try {
    const elapsed = Date.now() - lastCronSuccess.ts;
    if (lastCronSuccess.ts > 0 && elapsed > 20 * 60 * 1000) {
      const mins = Math.round(elapsed / 60_000);
      await alert(botToken, 'cron-stale',
        `⚠️ GoalLine cron last succeeded ${mins} min ago — may be stuck or failing`);
    }
  } catch (err) { log.warn('dl-monitor: cron-health check failed', err); }

  // R6: Daily Line lifecycle monitoring

  // 4. Missed card create — no card for tomorrow by 20:00 UTC (= 3AM VN, cards auto-create daily)
  try {
    const now = new Date();
    if (now.getUTCHours() >= 20) {
      const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
      const { data: tomorrowCards } = await db
        .from('gl_daily_cards')
        .select('id')
        .eq('utc_date', tomorrow)
        .limit(1);
      if (!tomorrowCards?.length) {
        await alert(botToken, `missed-create-${tomorrow}`,
          `⚠️ No Daily Line card created for ${tomorrow} — auto-create may have failed (check odds/matches availability)`);
      }
    }
  } catch (err) { log.warn('dl-monitor: missed-create check failed', err); }

  // 5. Missed lock — card still 'open' past cutoff_time_utc
  try {
    const { data: openPastCutoff } = await db
      .from('gl_daily_cards')
      .select('id, card_number, cutoff_time_utc')
      .eq('status', 'open')
      .lt('cutoff_time_utc', new Date().toISOString());

    for (const card of (openPastCutoff ?? []) as { id: string; card_number: number; cutoff_time_utc: string }[]) {
      await alert(botToken, `missed-lock-${card.id}`,
        `⚠️ Card #${card.card_number} still 'open' past cutoff (${card.cutoff_time_utc}) — auto-lock may have failed`);
    }
  } catch (err) { log.warn('dl-monitor: missed-lock check failed', err); }

  // 6. Missed live transition — card 'locked' but matches are live (kickoff passed + livescore shows live)
  try {
    const { data: lockedCards } = await db
      .from('gl_daily_cards')
      .select('id, card_number')
      .eq('status', 'locked');

    for (const card of (lockedCards ?? []) as { id: string; card_number: number }[]) {
      const { data: junctions } = await db
        .from('gl_daily_card_matches')
        .select('match_id')
        .eq('daily_card_id', card.id);
      if (!junctions?.length) continue;

      const matchIds = (junctions as { match_id: string }[]).map((j) => j.match_id);
      const { data: liveMatches } = await db
        .from('gl_matches')
        .select('id')
        .in('id', matchIds)
        .eq('status', 'live');

      if (liveMatches && liveMatches.length > 0) {
        await alert(botToken, `missed-live-${card.id}`,
          `⚠️ Card #${card.card_number} still 'locked' but ${liveMatches.length} match(es) are live — transition to 'live' may have failed`);
      }
    }
  } catch (err) { log.warn('dl-monitor: missed-live check failed', err); }

  // 7. Inconsistent totals — card settled but total goals != sum of match valid_goals
  try {
    const { data: settledCards } = await db
      .from('gl_daily_cards')
      .select('id, card_number, goal_line, settlement_result')
      .eq('status', 'settled');

    for (const card of (settledCards ?? []) as { id: string; card_number: number; goal_line: number; settlement_result: string }[]) {
      const { data: junctions } = await db
        .from('gl_daily_card_matches')
        .select('match_id')
        .eq('daily_card_id', card.id);
      if (!junctions?.length) continue;

      const matchIds = (junctions as { match_id: string }[]).map((j) => j.match_id);
      const { data: matches } = await db
        .from('gl_matches')
        .select('valid_goals')
        .in('id', matchIds);

      const total = (matches as { valid_goals: number | null }[] ?? [])
        .reduce((sum, m) => sum + (m.valid_goals ?? 0), 0);
      const expectedResult = total > card.goal_line ? 'over' : 'under';

      if (card.settlement_result !== expectedResult) {
        await alert(botToken, `inconsistent-${card.id}`,
          `🚨 Card #${card.card_number} settled as '${card.settlement_result}' but goals=${total} vs line=${card.goal_line} → expected '${expectedResult}'`);
      }
    }
  } catch (err) { log.warn('dl-monitor: inconsistent-totals check failed', err); }

  // R9: AI/social job failures — drain and alert
  try {
    const drained = drainFailures();
    const msg = formatFailureAlert(drained);
    if (msg) {
      await sendAlert(botToken, msg);
      log.warn(`dl-monitor: alerted ${drained.length} job failure(s)`);
    }
  } catch (err) { log.warn('dl-monitor: job-failure check failed', err); }
}
