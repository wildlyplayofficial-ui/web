/**
 * Curator bot — the human gate at the FRONT of the pipeline (decision #10).
 * /pick publishes immediately; everything downstream is automatic, no approval step.
 */
import { Bot } from 'grammy';
import { isAllowed } from './allowlist';
import type { EventMatch, MatchQuery } from './event-lookup';
import { parsePick, type ParsedPick } from './parse-pick';
import { settlePick } from './settle';
import { announceResult } from './announce';
import { announcePick, announceVoid } from './announce-pick';
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
  /** Auto-attach odds-api event + participant IDs when `event:` is omitted (Nick 12/6). Null on no/ambiguous match. Never throws. */
  findEvent?: (pick: MatchQuery) => Promise<EventMatch | null>;
  /** 3-point plan (12/6): announce new picks on the TG channel + FB Page. */
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
  /** On-demand web cache busting after pick lifecycle events (Nick 13/6). Never throws. */
  revalidate?: (tags: string[]) => Promise<void>;
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
    await ctx.reply(confirmationCard(row) + lookupLine);
    if (deps.preview) void deps.preview(row); // newsroom preview — must not delay the confirmation
    if (deps.translateThesis) void deps.translateThesis(row); // thesis vi/th/es — same fire-and-forget
    // 3-point plan (12/6): channel + FB announcement, fire-and-forget like the preview.
    void announcePick({
      api: bot.api,
      channelChatId: deps.channelChatId,
      store: deps.store,
      siteUrl: deps.siteUrl,
      facebook: deps.facebook,
    }, row);
  });

  bot.command('board', async (ctx) => {
    const published = await deps.store.listByStatus(['published']);
    const today = new Date().toISOString().slice(0, 10);
    const todays = published.filter((p) => p.kickoff_utc.slice(0, 10) === today);
    if (todays.length === 0) {
      await ctx.reply('No picks today.'); // zero-pick days are normal (decision #11)
      return;
    }
    await ctx.reply(todays.map(boardLine).join('\n\n'));
  });

  bot.command('record', async (ctx) => {
    const settled = await deps.store.listByStatus(['won', 'lost', 'push']);
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

  bot.catch((err) => log.error('bot error:', err.error));
  return bot;
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
    status: 'published',
    published_at: new Date().toISOString(),
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
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
