/**
 * Curator bot — the human gate at the FRONT of the pipeline (decision #10).
 * /pick publishes immediately; everything downstream is automatic, no approval step.
 */
import { Bot } from 'grammy';
import { isAllowed } from './allowlist';
import type { EventMatch, MatchQuery } from './event-lookup';
import { parsePick, type ParsedPick } from './parse-pick';
import { parseWatching } from './parse-watching';
import { parseNoPlay } from './parse-noplay';
import { publishNoPlayArticle } from './noplay-article';
import { translateWatchingNote } from './buzz-note';
import { generateBuzz, type BuzzDeps } from './buzz';
import { publishWatchingNews } from './watching-news';
import { settlePick } from './settle';
import { announceResult } from './announce';
import { announcePick, announceVoid } from './announce-pick';
import { generatePostmortemDraft, listOverdue, formatPostmortemCard, LOSS_TYPES, type LossType, type PostmortemDeps } from './postmortem';
import type { NewPick, PickRow, Store } from './store';
import { log } from './log';

export interface BotDeps {
  token: string;
  allowlist: Set<number>;
  store: Store;
  channelChatId: string | undefined;
  /** AI generators (optional — features degrade gracefully without them). */
  recap?: (pick: PickRow) => Promise<string | null>;
  recapArticle?: (pick: PickRow) => Promise<string | null>;
  /** Decision #19: fire-and-forget newsroom preview after a pick publishes. Never throws. */
  preview?: (pick: PickRow) => Promise<void>;
  /** Thesis translations (vi/th/es) into pick_content for the 4-language web UI. Never throws. */
  translateThesis?: (pick: PickRow) => Promise<void>;
  /** On-demand analysis article when a pick publishes. Never throws. */
  publishAnalysis?: (pick: PickRow) => Promise<void>;
  /** Auto-attach odds-api event + participant IDs when `event:` is omitted (Nick 12/6). Null on no/ambiguous match. Never throws. */
  findEvent?: (pick: MatchQuery) => Promise<EventMatch | null>;
  /** 3-point plan (12/6): announce new picks on the TG channel + FB Page. */
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
  /** On-demand web cache busting after pick lifecycle events (Nick 13/6). Never throws. */
  revalidate?: (tags: string[]) => Promise<void>;
  /** AI env for watching note translations (buzz v2). */
  aiEnv?: { apiKey: string | undefined; model?: string };
  /** T5: post-mortem AI draft generation (fire-and-forget after settle). */
  postmortem?: PostmortemDeps;
  /** Callback after /approve — enqueue post-mortem article. */
  onApprove?: (pickId: string) => Promise<void>;
}

export function createBot(deps: BotDeps): Bot {
  const bot = new Bot(deps.token);

  // Allowlist gate — everyone not on CURATOR_USER_IDS is ignored silently.
  bot.use(async (ctx, next) => {
    if (isAllowed(ctx.from?.id, deps.allowlist)) await next();
  });

  bot.command('pick', async (ctx) => {
    const result = parsePick(ctx.message?.text ?? '');
    if (!result.ok) {
      await ctx.reply(`Pick rejected — ${result.errors.length} problem(s):\n` +
        result.errors.map((e) => `\u2022 ${e}`).join('\n'));
      return;
    }
    // T2: Confidence/stake warning — warn but don't block (spec §3)
    const warnings: string[] = [];
    const { confidence, stake, odds } = result.pick;
    if (confidence === 'high' && stake < 1) {
      warnings.push('⚠️ HIGH confidence but stake < 1u — unusual. Publish anyway.');
    } else if (confidence === 'low' && stake >= 2) {
      warnings.push('⚠️ LOW confidence but stake ≥ 2u — unusual. Publish anyway.');
    }
    if (confidence === 'high' && odds > 3.0) {
      warnings.push('⚠️ HIGH confidence at long odds (> 3.00) — unusual. Publish anyway.');
    }

    // Picks are immutable after publish → look up the event id BEFORE insert.
    // findEvent never throws and returns null on any failure/ambiguity.
    let autoEvent: EventMatch | null = null;
    let lookupLine = '';
    if (result.pick.eventId === null && deps.findEvent) {
      autoEvent = await deps.findEvent(result.pick);
      lookupLine = autoEvent !== null
        ? `\nEvent id ${autoEvent.id} auto-attached (auto-settle on)`
        : '\nNo event id — settle manually with /score';
    }
    const row = await deps.store.insertPick(toNewPick(result.pick, autoEvent));
    log.info(`published pick ${row.id}: ${row.selection} @ ${row.odds_publish}`);
    if (deps.revalidate) void deps.revalidate(['picks']);
    // Auto-link: if there's an active watching entry for the same match, mark it 'picked'.
    void linkWatchingForPick(deps.store, row, deps.revalidate);
    const warningLine = warnings.length > 0 ? '\n' + warnings.join('\n') : '';
    await ctx.reply(confirmationCard(row) + lookupLine + warningLine);
    if (deps.preview) void deps.preview(row); // newsroom preview — must not delay the confirmation
    if (deps.translateThesis) void deps.translateThesis(row); // thesis vi/th/es — same fire-and-forget
    // Nick 15/6: running picks (in-play, has publish_score) skip analysis — no SEO value for mid-match articles
    if (deps.publishAnalysis && row.publish_score_home == null) void deps.publishAnalysis(row);
    // 3-point plan (12/6): channel + FB announcement, fire-and-forget like the preview.
    void announcePick({
      api: bot.api,
      channelChatId: deps.channelChatId,
      store: deps.store,
      siteUrl: deps.siteUrl,
      facebook: deps.facebook,
    }, row, { hook: result.pick.hook, againstMarket: result.pick.againstMarket });
  });

  bot.command('board', async (ctx) => {
    const published = await deps.store.listByStatus(['published'], 'curator');
    const today = new Date().toISOString().slice(0, 10);
    const todays = published.filter((p) => p.kickoff_utc.slice(0, 10) === today);
    if (todays.length === 0) {
      await ctx.reply('No picks today.'); // zero-pick days are normal (decision #11)
      return;
    }
    await ctx.reply(todays.map(boardLine).join('\n\n'));
  });

  bot.command('record', async (ctx) => {
    const settled = await deps.store.listByStatus(['won', 'lost', 'push'], 'curator');
    const count = (s: string) => settled.filter((p) => p.status === s).length;
    const units = Math.round(settled.reduce((sum, p) => sum + Number(p.units_pl ?? 0), 0) * 100) / 100;
    await ctx.reply(
      `Record: ${count('won')}W-${count('lost')}L-${count('push')}P\n` +
      `Units: ${units > 0 ? '+' : ''}${units} (${settled.length} settled)`,
    );
  });

  bot.command('score', async (ctx) => {
    const m = (ctx.match ?? '').trim().match(/^(\S+)\s+(\d+)\s*-\s*(\d+)$/);
    if (!m) {
      await ctx.reply('Usage: /score <pick_id> <home>-<away>\nExample: /score 8d4f… 2-0');
      return;
    }
    const pick = await deps.store.getPick(m[1]);
    if (!pick) {
      await ctx.reply(`No pick found with id ${m[1]}`);
      return;
    }
    if (pick.status !== 'published') {
      await ctx.reply(`Pick ${pick.id} is "${pick.status}" — only published picks can be settled.`);
      return;
    }
    try {
      const settled = await settlePick(deps.store, pick, { home: Number(m[2]), away: Number(m[3]) });
      log.info(`manually settled pick ${settled.id} → ${settled.status} (${settled.units_pl}u)`);
      if (deps.revalidate) void deps.revalidate(['picks', 'posts']);
      await ctx.reply(
        `Settled ${settled.home_team} ${settled.home_score}-${settled.away_score} ${settled.away_team}\n` +
        `${settled.selection} → ${settled.status?.toUpperCase()} ` +
        `(${settled.raw_outcome}, ${Number(settled.units_pl) > 0 ? '+' : ''}${settled.units_pl}u)`,
      );
      // T5: fire-and-forget post-mortem draft — settlement never waits for AI
      if (deps.postmortem) void generatePostmortemDraft(deps.postmortem, settled);
      await announceResult({
        api: bot.api,
        channelChatId: deps.channelChatId,
        store: deps.store,
        siteUrl: deps.siteUrl,
        facebook: deps.facebook,
        recap: deps.recap,
        recapArticle: deps.recapArticle,
      }, settled);
    } catch (err) {
      log.error(`/score failed for pick ${pick.id}:`, err);
      await ctx.reply(`Settlement failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Void a pick BEFORE kickoff (Nick 12/6). Trust model: picks are never edited
  // or deleted — voiding keeps the play visible with a VOID badge and excludes
  // it from the record. Changing a pick = /void the old one + /pick a new one.
  bot.command('void', async (ctx) => {
    const id = (ctx.match ?? '').trim();
    if (!id) {
      await ctx.reply('Usage: /void <pick_id>\nOnly works before kickoff.');
      return;
    }
    const pick = await deps.store.getPick(id);
    if (!pick) {
      await ctx.reply(`No pick found with id ${id}`);
      return;
    }
    if (pick.status !== 'published') {
      await ctx.reply(`Pick ${pick.id} is "${pick.status}" — only published picks can be voided.`);
      return;
    }
    if (new Date(pick.kickoff_utc) <= new Date()) {
      await ctx.reply(`Too late — kickoff was ${pick.kickoff_utc}. Picks cannot be voided after kickoff.`);
      return;
    }
    const voided = await deps.store.updatePick(pick.id, { status: 'void' });
    log.info(`voided pick ${voided.id} before kickoff: ${voided.selection}`);
    if (deps.revalidate) void deps.revalidate(['picks']);
    await ctx.reply(
      `\u26D4 Voided ${voided.home_team} vs ${voided.away_team}\n` +
      `${voided.selection} @ ${voided.odds_publish} — does not count toward the record.\n` +
      'To replace it, publish a new /pick.',
    );
    void announceVoid({
      api: bot.api,
      channelChatId: deps.channelChatId,
      store: deps.store,
      siteUrl: deps.siteUrl,
      facebook: deps.facebook,
    }, voided);
  });

  bot.command('watching', async (ctx) => {
    const result = parseWatching(ctx.message?.text ?? '');
    if (!result.ok) {
      await ctx.reply(`Watching rejected — ${result.errors.length} problem(s):\n` +
        result.errors.map((e) => `\u2022 ${e}`).join('\n'));
      return;
    }
    const { watching } = result;
    const row = await deps.store.insertWatching({
      home_team: watching.homeTeam,
      away_team: watching.awayTeam,
      league: watching.league,
      kickoff_utc: watching.kickoffUtc,
      note: watching.note,
      status: 'active',
      pick_id: null,
    });
    log.info(`watching ${row.id}: ${row.home_team} vs ${row.away_team}`);
    if (deps.revalidate) void deps.revalidate(['watching']);
    // Fire-and-forget: translate note into 4 languages if note is not empty
    log.info(`watching note-translate gate: note=${!!row.note} aiEnv=${!!deps.aiEnv?.apiKey}`);
    if (row.note && deps.aiEnv?.apiKey) {
      void translateWatchingNote({ store: deps.store, env: deps.aiEnv, revalidate: deps.revalidate }, row)
        .then(() => log.info(`note-translate completed for watching ${row.id}`))
        .catch((err) => log.warn(`note-translate failed for watching ${row.id}:`, err));
    }
    // Nick 16/6: generate buzz immediately on /watching (don't wait for cron)
    if (deps.aiEnv?.apiKey) {
      const aiEnv = deps.aiEnv;
      void (async () => {
        try {
          const snapshot = await generateBuzz(
            { store: deps.store, env: aiEnv },
            row as unknown as import('./store').WatchingRow,
          );
          if (snapshot) {
            await deps.store.updateWatching(row.id, { buzz_history: [snapshot] });
            if (deps.revalidate) void deps.revalidate(['watching']);
            log.info(`buzz generated immediately for watching ${row.id}`);
          }
        } catch (err) {
          log.warn(`immediate buzz failed for watching ${row.id}:`, err);
        }
      })();
    }
    // News article (SEO pre-match preview) — fire-and-forget, never throws.
    // Post Restructure v1 §2.4: WATCHING card replaces the article announce (TG only).
    if (deps.aiEnv?.apiKey) {
      void publishWatchingNews(
        {
          store: deps.store, env: deps.aiEnv, revalidateUrl: deps.siteUrl,
          card: { api: bot.api, channelChatId: deps.channelChatId, siteUrl: deps.siteUrl },
        },
        row as unknown as import('./store').WatchingRow,
        watching.reason,
      );
    }
    await ctx.reply(
      `\uD83D\uDC41 Watching added\n` +
      `id: ${row.id}\n` +
      `${row.home_team} vs ${row.away_team}\n` +
      `${row.league}\n` +
      `kickoff: ${row.kickoff_utc}` +
      (row.note ? `\nnote: ${row.note}` : ''),
    );
  });

  bot.command('noplay', async (ctx) => {
    const result = parseNoPlay(ctx.message?.text ?? '');
    if (!result.ok) {
      await ctx.reply(`No-play rejected — ${result.errors.length} problem(s):\n` +
        result.errors.map((e) => `\u2022 ${e}`).join('\n'));
      return;
    }
    const { noplay } = result;
    log.info(`noplay: ${noplay.homeTeam} vs ${noplay.awayTeam} — ${noplay.reason}`);
    await ctx.reply(
      `\u26D4 No Play logged\n` +
      `${noplay.homeTeam} vs ${noplay.awayTeam}\n` +
      `${noplay.league}\n` +
      `reason: ${noplay.reason}` +
      (noplay.watching ? `\nwatching: ${noplay.watching}` : '') +
      (noplay.note ? `\nnote: ${noplay.note}` : ''),
    );
    // Generate no-play article — fire-and-forget, never throws.
    // Post Restructure v1 §2.2: 3-line NO-PLAY card, verdict first (TG only).
    if (deps.aiEnv?.apiKey) {
      void publishNoPlayArticle(
        {
          store: deps.store, env: deps.aiEnv, revalidateUrl: deps.siteUrl,
          card: { api: bot.api, channelChatId: deps.channelChatId, siteUrl: deps.siteUrl },
        },
        noplay,
      );
    }
  });

  // ── T5: Post-mortem review commands ──
  bot.command('review', async (ctx) => {
    const id = (ctx.match ?? '').trim();
    if (!id) {
      await ctx.reply('Usage: /review <pick_id>');
      return;
    }
    const pick = await deps.store.getPick(id);
    if (!pick) {
      await ctx.reply(`No pick found with id ${id}`);
      return;
    }
    if (!['won', 'lost', 'push'].includes(pick.status ?? '')) {
      await ctx.reply(`Pick ${pick.id} is "${pick.status}" — only settled picks have post-mortems.`);
      return;
    }
    await ctx.reply(formatPostmortemCard(pick));
  });

  bot.command('approve', async (ctx) => {
    const args = (ctx.match ?? '').trim().split(/\s+/);
    const id = args[0];
    const lossTypeArg = args[1] as LossType | undefined;
    if (!id) {
      await ctx.reply('Usage: /approve <pick_id> [loss_type]\nLoss types: variance, thesis-error, price-error, model-error');
      return;
    }
    const pick = await deps.store.getPick(id);
    if (!pick) {
      await ctx.reply(`No pick found with id ${id}`);
      return;
    }
    if (!['won', 'lost', 'push'].includes(pick.status ?? '')) {
      await ctx.reply(`Pick ${pick.id} is "${pick.status}" — only settled picks can be approved.`);
      return;
    }
    if (pick.status === 'lost' && !lossTypeArg) {
      await ctx.reply('Loss picks require a loss_type: /approve <id> variance|thesis-error|price-error|model-error');
      return;
    }
    if (lossTypeArg && !LOSS_TYPES.includes(lossTypeArg)) {
      await ctx.reply(`Invalid loss_type "${lossTypeArg}". Valid: ${LOSS_TYPES.join(', ')}`);
      return;
    }
    // Use reply text as edited review if the curator replied to the draft
    const replyText = ctx.message?.reply_to_message?.text;
    const finalText = replyText || pick.postmortem_draft || '';
    const patch: Partial<PickRow> = {
      postmortem_status: 'approved',
      postmortem_approved: finalText,
      postmortem_at: new Date().toISOString(),
    };
    if (lossTypeArg) patch.loss_type = lossTypeArg;
    await deps.store.updatePick(pick.id, patch);
    log.info(`postmortem approved for pick ${pick.id}${lossTypeArg ? ` (${lossTypeArg})` : ''}`);
    if (deps.revalidate) void deps.revalidate(['picks']);
    // Post-mortem article enqueued via onApprove callback
    if (deps.onApprove) void deps.onApprove(pick.id);
    await ctx.reply(
      `\u2705 Post-mortem approved for ${pick.home_team} vs ${pick.away_team}` +
      (lossTypeArg ? `\nLoss type: ${lossTypeArg}` : ''),
    );
  });

  bot.command('overdue', async (ctx) => {
    const overdue = await listOverdue(deps.store);
    if (overdue.length === 0) {
      await ctx.reply('No overdue post-mortems. All clear.');
      return;
    }
    const lines = overdue.map((p) => {
      const age = p.settled_at
        ? Math.round((Date.now() - new Date(p.settled_at).getTime()) / 3_600_000)
        : 0;
      return `${p.status?.toUpperCase()} ${p.home_team} vs ${p.away_team} (${age}h) — ${p.id.slice(0, 8)}`;
    });
    await ctx.reply(`\u23f0 ${overdue.length} overdue post-mortem(s):\n\n${lines.join('\n')}`);
  });

  bot.command('unwatch', async (ctx) => {
    const id = (ctx.match ?? '').trim();
    if (!id) {
      await ctx.reply('Usage: /unwatch <watching_id>');
      return;
    }
    try {
      const row = await deps.store.expireWatching(id);
      log.info(`expired watching ${row.id}`);
      if (deps.revalidate) void deps.revalidate(['watching']);
      await ctx.reply(`\u274C Stopped watching ${row.home_team} vs ${row.away_team}`);
    } catch {
      await ctx.reply(`Could not expire watching ${id} — not found or already expired.`);
    }
  });

  // ── Daily Line TMA: group lifecycle ──
  bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.myChatMember.chat;
    if (chat.type !== 'group' && chat.type !== 'supergroup') return;

    const newStatus = ctx.myChatMember.new_chat_member.status;
    const fromId = ctx.myChatMember.from.id;
    const tgGroupId = chat.id;
    const title = chat.title ?? `Group ${tgGroupId}`;

    if (newStatus === 'member' || newStatus === 'administrator') {
      // Bot was added to a group — register it
      try {
        await deps.store.upsertGroup(tgGroupId, title, fromId);
        log.info(`joined group ${tgGroupId} "${title}" (added by ${fromId})`);
      } catch (err) {
        log.warn(`upsertGroup failed for ${tgGroupId}:`, err);
      }

      const siteUrl = deps.siteUrl;
      const webAppUrl = `${siteUrl}/tma/daily-line?startapp=grp_${tgGroupId}`;
      await ctx.reply(
        'Daily Line is active in this group! Tap below to make your pick.',
        {
          reply_markup: {
            inline_keyboard: [[{
              text: '\u26BD Play Daily Line',
              web_app: { url: webAppUrl },
            }]],
          },
        },
      );
    } else if (newStatus === 'left' || newStatus === 'kicked') {
      // Bot was removed from a group — mark inactive
      try {
        await deps.store.markGroupInactive(tgGroupId);
        log.info(`left group ${tgGroupId} "${title}"`);
      } catch (err) {
        log.warn(`markGroupInactive failed for ${tgGroupId}:`, err);
      }
    }
  });

  bot.catch((err) => log.error('bot error:', err.error));
  return bot;
}

/** T9: derive market side from selection. */
function deriveMarketSide(p: ParsedPick): string {
  const sel = p.selection.toLowerCase();
  if (sel.includes('over')) return 'over';
  if (sel.includes('under')) return 'under';
  if (sel === 'draw' || sel === 'x') return 'draw';
  if (sel.includes(p.homeTeam.toLowerCase().split(' ')[0])) return 'home';
  if (sel.includes(p.awayTeam.toLowerCase().split(' ')[0])) return 'away';
  return 'other';
}

function toNewPick(p: ParsedPick, autoEvent: EventMatch | null = null): NewPick {
  return {
    fixture_id: p.eventId ?? autoEvent?.id ?? 0, // odds-api event id; 0 = manual settlement via /score
    league: p.league,
    kickoff_utc: p.kickoffUtc,
    home_team: p.homeTeam,
    away_team: p.awayTeam,
    market: p.market,
    selection: p.selection,
    line: p.line,
    odds_publish: p.odds, // odds snapshot at publish — immutable (decision #2)
    odds_close: null, // CLV: captured by the poller near kickoff
    publish_score_home: p.publishScoreHome, // running pick: score at publish (null = pre-match)
    publish_score_away: p.publishScoreAway,
    home_id: autoEvent?.homeId ?? null, // participant id for team logo (13/6)
    away_id: autoEvent?.awayId ?? null,
    stake_units: p.stake,
    thesis: p.thesis,
    confidence: p.confidence, // Trust anchor: pre-registered, immutable
    primary_edge: p.primaryEdge, // T3: primary reason for the pick
    consensus_edge_pct: p.consensusEdgePct,
    supporting_evidence: p.supportingEvidence.length > 0 ? p.supportingEvidence : null, // T4: max 2 tags
    loss_type: null, // T8: set after settlement for losses
    // T5/T6: post-mortem fields — null until settlement triggers AI draft
    postmortem_status: null,
    postmortem_draft: null,
    postmortem_approved: null,
    postmortem_at: null,
    // T9: sub-dimension calibration tags (auto-derived, no-backfill)
    market_side: deriveMarketSide(p),
    favored_dog: p.odds < 2.0 ? 'favored' : p.odds > 2.2 ? 'dog' : 'neutral',
    status: 'published',
    published_at: new Date().toISOString(),
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    author: p.author,
  };
}

function confirmationCard(row: PickRow): string {
  return [
    '\ud83d\udccc Pick published',
    `id: ${row.id}`,
    `${row.home_team} vs ${row.away_team}`,
    row.league,
    `kickoff: ${row.kickoff_utc}`,
    `market: ${row.market} | selection: ${row.selection}` + (row.line != null ? ` | line: ${row.line}` : ''),
    `odds: ${row.odds_publish} (snapshot at publish) | stake: ${row.stake_units}u`,
    row.fixture_id > 0
      ? `event: ${row.fixture_id} (auto-settlement on)`
      : 'event: none — settle manually with /score',
    `thesis: ${row.thesis}`,
  ].join('\n');
}

function boardLine(p: PickRow): string {
  return `${p.home_team} vs ${p.away_team} (${p.kickoff_utc.slice(11, 16)} UTC)\n` +
    `${p.market} ${p.selection} @ ${p.odds_publish} | ${p.stake_units}u\nid: ${p.id}`;
}

/** Fuzzy-match active watching entries against a freshly published pick.
 *  Compares lower-cased home+away team names. Fire-and-forget; never throws. */
async function linkWatchingForPick(
  store: Store,
  pick: PickRow,
  revalidate?: (tags: string[]) => Promise<void>,
): Promise<void> {
  try {
    const active = await store.getActiveWatching();
    const norm = (s: string) => s.toLowerCase().trim();
    const match = active.find(
      (w) => norm(w.home_team) === norm(pick.home_team) && norm(w.away_team) === norm(pick.away_team),
    );
    if (match) {
      await store.linkWatchingToPick(match.id, pick.id);
      log.info(`linked watching ${match.id} to pick ${pick.id}`);
      if (revalidate) void revalidate(['watching']);
    }
  } catch (err) {
    log.warn('linkWatchingForPick failed (non-fatal):', err);
  }
}
