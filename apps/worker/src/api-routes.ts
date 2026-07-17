/**
 * HTTP API routes — mirrors Telegram bot commands for automation.
 * Each endpoint reuses the same parsers/pipelines as the bot.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { parsePick } from './parse-pick';
import { parseWatching } from './parse-watching';
import { parseNoPlay } from './parse-noplay';
import { publishNoPlayArticle } from './noplay-article';
import { translateWatchingNote } from './buzz-note';
import { generateBuzz } from './buzz';
import { publishWatchingNews, buildNewsSlug } from './watching-news';
import { settlePick } from './settle';
import { announceResult } from './announce';
import { announcePick, announceVoid } from './announce-pick';
import { generatePostmortemDraft, listOverdue, LOSS_TYPES, type LossType } from './postmortem';
import type { AnnounceArticleDeps } from './announce-article';
import { authorTypeOf, type PickAuthor, type PickRow, type Store, type NewPick } from './store';
import type { EventMatch, MatchQuery } from './event-lookup';
import { fetchFinishedFixtures } from './finished-fixtures';
import { fetchUpcomingFixtures } from './upcoming-fixtures';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueJob } from './job-queue';
import { log } from './log';

export interface ApiDeps {
  store: Store;
  aiEnv: { apiKey: string | undefined; model?: string };
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
  revalidate: (tags: string[]) => Promise<void>;
  findEvent?: (pick: MatchQuery) => Promise<EventMatch | null>;
  preview?: (pick: PickRow) => Promise<void>;
  translateThesis?: (pick: PickRow) => Promise<void>;
  publishAnalysis?: (pick: PickRow) => Promise<void>;
  postmortem?: { store: Store; env: { apiKey: string | undefined; model?: string } };
  onApprove?: (pickId: string) => Promise<void>;
  announceDeps: AnnounceArticleDeps;
  persistDb: SupabaseClient | null;
  recap?: (pick: PickRow) => Promise<string | null>;
  recapArticle?: (pick: PickRow) => Promise<string | null>;
  livescore?: { key: string; secret: string };
}

type Json = Record<string, unknown>;

function json(res: ServerResponse, status: number, body: Json) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Derive market side from selection text. */
function deriveMarketSide(sel: string): string {
  const s = sel.toLowerCase();
  if (s.includes('over')) return 'over';
  if (s.includes('under')) return 'under';
  if (s === 'draw' || s === 'x') return 'draw';
  return 'side';
}

/** Author query param: defaults to 'curator' when unspecified (credibility firewall, §12.A). */
function parseAuthorParam(raw: unknown): PickAuthor | 'invalid' {
  if (raw === undefined) return 'curator';
  if (raw === 'curator' || raw === 'scout') return raw;
  return 'invalid';
}

export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  deps: ApiDeps,
): Promise<boolean> {
  const url = req.url ?? '';
  if (!url.startsWith('/api/')) return false;

  let payload: Json;
  try { payload = JSON.parse(body); } catch {
    json(res, 400, { ok: false, error: 'invalid JSON' });
    return true;
  }

  const text = typeof payload.text === 'string' ? payload.text : '';

  // ── POST /api/pick ──
  if (url === '/api/pick') {
    if (!text) { json(res, 400, { ok: false, error: 'text required (same format as /pick command)' }); return true; }
    const result = parsePick('/pick ' + text);
    if (!result.ok) { json(res, 422, { ok: false, error: 'parse_failed', errors: result.errors }); return true; }

    try {
      let autoEvent: EventMatch | null = null;
      if (result.pick.eventId === null && deps.findEvent) {
        autoEvent = await deps.findEvent(result.pick);
      }
      const newPick: NewPick = {
        home_team: result.pick.homeTeam,
        away_team: result.pick.awayTeam,
        league: result.pick.league,
        kickoff_utc: result.pick.kickoffUtc,
        market: result.pick.market,
        selection: result.pick.selection,
        line: result.pick.line ?? null,
        odds_publish: result.pick.odds,
        odds_close: null,
        publish_score_home: result.pick.publishScoreHome,
        publish_score_away: result.pick.publishScoreAway,
        home_id: autoEvent?.homeId ?? null,
        away_id: autoEvent?.awayId ?? null,
        stake_units: result.pick.stake,
        thesis: result.pick.thesis,
        confidence: result.pick.confidence,
        fixture_id: autoEvent?.id ?? result.pick.eventId ?? 0,
        market_side: deriveMarketSide(result.pick.selection),
        favored_dog: null,
        primary_edge: result.pick.primaryEdge ?? null,
        consensus_edge_pct: result.pick.consensusEdgePct ?? null,
        supporting_evidence: result.pick.supportingEvidence ?? [],
        loss_type: null,
        postmortem_status: null,
        postmortem_draft: null,
        postmortem_approved: null,
        postmortem_at: null,
        status: 'published',
        published_at: new Date().toISOString(),
        settled_at: null,
        home_score: null,
        away_score: null,
        raw_outcome: null,
        units_pl: null,
        author: result.pick.author,
      };
      const row = await deps.store.insertPick(newPick);
      log.info(`api: published pick ${row.id}: ${row.selection} @ ${row.odds_publish} (author=${row.author})`);
      void deps.revalidate(['picks']);
      if (deps.preview) void deps.preview(row);
      if (deps.translateThesis) void deps.translateThesis(row);
      if (deps.publishAnalysis && row.publish_score_home == null) void deps.publishAnalysis(row);
      void announcePick(deps.announceDeps, row, { hook: result.pick.hook, againstMarket: result.pick.againstMarket });
      json(res, 200, {
        ok: true, id: row.id, match: `${row.home_team} vs ${row.away_team}`, selection: row.selection,
        // T7 (launch blocker): author_type is ALWAYS derived here from `author` — never accept it from the client.
        author: row.author, author_type: authorTypeOf(row.author),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`api /pick failed: ${msg}`);
      json(res, 500, { ok: false, error: msg });
    }
    return true;
  }

  // ── POST /api/watching ──
  if (url === '/api/watching') {
    if (!text) { json(res, 400, { ok: false, error: 'text required (same format as /watching command)' }); return true; }
    const result = parseWatching('/watching ' + text);
    if (!result.ok) { json(res, 422, { ok: false, error: 'parse_failed', errors: result.errors }); return true; }
    const { watching } = result;
    // REQ 1: accept presence from JSON payload field OR text parse (spec: "add a field to payload")
    const presenceFromPayload = payload.presence === true || payload.presence === 'true' || payload.presence === 1;
    const presence = presenceFromPayload || watching.presence;
    const row = await deps.store.insertWatching({
      home_team: watching.homeTeam, away_team: watching.awayTeam,
      league: watching.league, kickoff_utc: watching.kickoffUtc,
      note: watching.note, status: 'active', pick_id: null,
      author: watching.author,
      presence,
    });
    log.info(`api: watching ${row.id}: ${row.home_team} vs ${row.away_team}`);
    void deps.revalidate(['watching']);
    if (row.note && deps.aiEnv?.apiKey && deps.persistDb) {
      void enqueueJob(deps.persistDb, 'note-translate', { watchingId: row.id }).catch(e => log.warn('enqueue note-translate:', e));
      void enqueueJob(deps.persistDb, 'watching-news', { watchingId: row.id, reason: watching.reason, presence }).catch(e => log.warn('enqueue watching-news:', e));
    } else if (row.note && deps.aiEnv?.apiKey) {
      void translateWatchingNote({ store: deps.store, env: deps.aiEnv, revalidate: deps.revalidate }, row);
      void publishWatchingNews({
        store: deps.store, env: deps.aiEnv, revalidateUrl: deps.siteUrl,
        card: { api: deps.announceDeps.api, channelChatId: deps.announceDeps.channelChatId, siteUrl: deps.siteUrl },
      }, row as unknown as import('./store').WatchingRow, watching.reason);
    }
    if (deps.aiEnv?.apiKey) {
      void (async () => {
        try {
          const snapshot = await generateBuzz({ store: deps.store, env: deps.aiEnv }, row as unknown as import('./store').WatchingRow);
          if (snapshot) { await deps.store.updateWatching(row.id, { buzz_history: [snapshot] }); void deps.revalidate(['watching']); }
        } catch (err) { log.warn(`api buzz failed:`, err); }
      })();
    }
    json(res, 200, {
      ok: true, id: row.id, match: `${row.home_team} vs ${row.away_team}`,
      author: row.author, author_type: authorTypeOf(row.author),
    });
    return true;
  }

  // ── POST /api/noplay ──
  if (url === '/api/noplay') {
    if (!text) { json(res, 400, { ok: false, error: 'text required (same format as /noplay command)' }); return true; }
    const result = parseNoPlay('/noplay ' + text);
    if (!result.ok) { json(res, 422, { ok: false, error: 'parse_failed', errors: result.errors }); return true; }
    const { noplay } = result;
    log.info(`api: noplay ${noplay.homeTeam} vs ${noplay.awayTeam} — ${noplay.reason}`);
    if (deps.aiEnv?.apiKey) {
      void publishNoPlayArticle({
        store: deps.store, env: deps.aiEnv, revalidateUrl: deps.siteUrl,
        card: { api: deps.announceDeps.api, channelChatId: deps.announceDeps.channelChatId, siteUrl: deps.siteUrl },
      }, noplay);
    }
    json(res, 200, {
      ok: true, match: `${noplay.homeTeam} vs ${noplay.awayTeam}`, reason: noplay.reason,
      author: noplay.author, author_type: authorTypeOf(noplay.author),
    });
    return true;
  }

  // ── POST /api/score ──
  if (url === '/api/score') {
    const pickId = typeof payload.pickId === 'string' ? payload.pickId : '';
    const home = typeof payload.home === 'number' ? payload.home : NaN;
    const away = typeof payload.away === 'number' ? payload.away : NaN;
    if (!pickId || isNaN(home) || isNaN(away)) {
      json(res, 400, { ok: false, error: 'pickId (string), home (number), away (number) required' }); return true;
    }
    const pick = await deps.store.getPick(pickId);
    if (!pick) { json(res, 404, { ok: false, error: 'pick not found' }); return true; }
    if (pick.status !== 'published') { json(res, 422, { ok: false, error: `pick is "${pick.status}", only published can be settled` }); return true; }
    try {
      const settled = await settlePick(deps.store, pick, { home, away });
      log.info(`api: settled ${settled.id} → ${settled.status} (${settled.units_pl}u)`);
      void deps.revalidate(['picks', 'posts']);
      if (deps.postmortem) void generatePostmortemDraft(deps.postmortem, settled);
      void announceResult({
        ...deps.announceDeps, recap: deps.recap, recapArticle: deps.recapArticle,
      }, settled);
      json(res, 200, { ok: true, id: settled.id, status: settled.status, units_pl: settled.units_pl });
    } catch (err) {
      json(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return true;
  }

  // ── POST /api/void ──
  if (url === '/api/void') {
    const pickId = typeof payload.pickId === 'string' ? payload.pickId : '';
    if (!pickId) { json(res, 400, { ok: false, error: 'pickId required' }); return true; }
    const pick = await deps.store.getPick(pickId);
    if (!pick) { json(res, 404, { ok: false, error: 'pick not found' }); return true; }
    if (pick.status !== 'published') { json(res, 422, { ok: false, error: `pick is "${pick.status}", only published can be voided` }); return true; }
    if (new Date(pick.kickoff_utc) <= new Date()) { json(res, 422, { ok: false, error: 'too late — past kickoff' }); return true; }
    const voided = await deps.store.updatePick(pick.id, { status: 'void' });
    log.info(`api: voided ${voided.id}`);
    void deps.revalidate(['picks']);
    void announceVoid(deps.announceDeps, voided);
    json(res, 200, {
      ok: true, id: voided.id, match: `${voided.home_team} vs ${voided.away_team}`,
      author: voided.author, author_type: authorTypeOf(voided.author),
    });
    return true;
  }

  // ── POST /api/approve ──
  if (url === '/api/approve') {
    const pickId = typeof payload.pickId === 'string' ? payload.pickId : '';
    const lossType = typeof payload.lossType === 'string' ? payload.lossType as LossType : undefined;
    const reviewText = typeof payload.reviewText === 'string' ? payload.reviewText : undefined;
    if (!pickId) { json(res, 400, { ok: false, error: 'pickId required' }); return true; }
    const pick = await deps.store.getPick(pickId);
    if (!pick) { json(res, 404, { ok: false, error: 'pick not found' }); return true; }
    if (!['won', 'lost', 'push'].includes(pick.status ?? '')) {
      json(res, 422, { ok: false, error: `pick is "${pick.status}", only settled picks can be approved` }); return true;
    }
    if (pick.status === 'lost' && !lossType) {
      json(res, 422, { ok: false, error: 'lossType required for lost picks: variance|thesis-error|price-error|model-error' }); return true;
    }
    if (lossType && !LOSS_TYPES.includes(lossType)) {
      json(res, 422, { ok: false, error: `invalid lossType. Valid: ${LOSS_TYPES.join(', ')}` }); return true;
    }
    const finalText = reviewText || pick.postmortem_draft || '';
    const patch: Partial<PickRow> = {
      postmortem_status: 'approved', postmortem_approved: finalText,
      postmortem_at: new Date().toISOString(),
    };
    if (lossType) patch.loss_type = lossType;
    await deps.store.updatePick(pick.id, patch);
    log.info(`api: approved postmortem for ${pick.id}${lossType ? ` (${lossType})` : ''}`);
    void deps.revalidate(['picks']);
    if (deps.onApprove) void deps.onApprove(pick.id);
    json(res, 200, { ok: true, id: pick.id, match: `${pick.home_team} vs ${pick.away_team}` });
    return true;
  }

  // ── POST /api/unwatch ──
  if (url === '/api/unwatch') {
    const watchingId = typeof payload.watchingId === 'string' ? payload.watchingId : '';
    if (!watchingId) { json(res, 400, { ok: false, error: 'watchingId required' }); return true; }
    const note = typeof payload.note === 'string' ? payload.note : undefined;
    try {
      const row = await deps.store.expireWatching(watchingId, note);
      log.info(`api: expired watching ${row.id}`);
      // REQ 4: presence cards → also remove the orphan article from public views
      if (row.presence) {
        try {
          const slug = buildNewsSlug(row.home_team, row.away_team, row.kickoff_utc);
          const deleted = await deps.store.deletePostsBySlug(slug);
          if (deleted > 0) log.info(`api unwatch: removed ${deleted} presence article post(s) for slug "${slug}"`);
        } catch (err) {
          log.warn(`api unwatch: failed to remove presence article:`, err);
        }
      }
      void deps.revalidate(['watching', 'posts']);
      json(res, 200, { ok: true, id: row.id, match: `${row.home_team} vs ${row.away_team}` });
    } catch {
      json(res, 404, { ok: false, error: 'watching not found or already expired' });
    }
    return true;
  }

  // ── GET /api/board ──
  if (url === '/api/board') {
    const author = parseAuthorParam(payload.author);
    if (author === 'invalid') { json(res, 400, { ok: false, error: 'author must be curator/scout' }); return true; }
    const published = await deps.store.listByStatus(['published'], author);
    const today = new Date().toISOString().slice(0, 10);
    const todays = published.filter(p => p.kickoff_utc.slice(0, 10) === today);
    json(res, 200, { ok: true, count: todays.length, picks: todays.map(p => ({
      id: p.id, match: `${p.home_team} vs ${p.away_team}`, selection: p.selection,
      odds: p.odds_publish, stake: p.stake_units, kickoff: p.kickoff_utc,
      author: p.author, author_type: authorTypeOf(p.author),
    }))});
    return true;
  }

  // ── GET /api/record ──
  if (url === '/api/record') {
    const author = parseAuthorParam(payload.author);
    if (author === 'invalid') { json(res, 400, { ok: false, error: 'author must be curator/scout' }); return true; }
    const settled = await deps.store.listByStatus(['won', 'lost', 'push'], author);
    const wins = settled.filter(p => p.status === 'won').length;
    const losses = settled.filter(p => p.status === 'lost').length;
    const pushes = settled.filter(p => p.status === 'push').length;
    const units = Math.round(settled.reduce((s, p) => s + Number(p.units_pl ?? 0), 0) * 100) / 100;
    const noPlayCount = await deps.store.countNoPlayByAuthor(author);
    json(res, 200, { ok: true, author, wins, losses, pushes, units, total: settled.length, no_play_count: noPlayCount });
    return true;
  }

  // ── GET /api/review ──
  if (url === '/api/review') {
    const pickId = typeof payload.pickId === 'string' ? payload.pickId : '';
    if (!pickId) { json(res, 400, { ok: false, error: 'pickId required' }); return true; }
    const pick = await deps.store.getPick(pickId);
    if (!pick) { json(res, 404, { ok: false, error: 'pick not found' }); return true; }
    json(res, 200, { ok: true, id: pick.id, match: `${pick.home_team} vs ${pick.away_team}`,
      status: pick.status, postmortem_status: pick.postmortem_status,
      draft: pick.postmortem_draft, approved: pick.postmortem_approved,
      author: pick.author, author_type: authorTypeOf(pick.author) });
    return true;
  }

  // ── GET /api/overdue ──
  if (url === '/api/overdue') {
    const overdue = await listOverdue(deps.store);
    json(res, 200, { ok: true, count: overdue.length, picks: overdue.map(p => ({
      id: p.id, match: `${p.home_team} vs ${p.away_team}`, status: p.status,
      settled_at: p.settled_at,
    }))});
    return true;
  }

  // ── GET /api/fixtures/finished (R0 Triage enrichment, Nick 4/7) ──
  // Note: served as POST like every other route here (server only accepts POST).
  if (url === '/api/fixtures/finished') {
    if (!deps.livescore) { json(res, 503, { ok: false, error: 'livescore not configured' }); return true; }
    const days = typeof payload.days === 'number' ? payload.days : 10;
    const fixtures = await fetchFinishedFixtures(deps.livescore, days);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fixtures));
    return true;
  }

  // ── GET /api/fixtures/upcoming (R0 Triage shadow-read diff, Nick 4/7 item ②) ──
  if (url === '/api/fixtures/upcoming') {
    if (!deps.livescore) { json(res, 503, { ok: false, error: 'livescore not configured' }); return true; }
    const days = typeof payload.days === 'number' ? payload.days : 14;
    const fixtures = await fetchUpcomingFixtures(deps.livescore, days);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fixtures));
    return true;
  }

  return false; // not an /api/ route we handle
}
