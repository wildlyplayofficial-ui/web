/** Worker entrypoint: Curator bot (long polling) + results poller. */
import 'dotenv/config';
import { parseAllowlist } from './allowlist';
import { announceResult } from './announce';
import { createBot } from './bot';
import { fetchOddsPayload } from './clv';
import { startWeeklyDigest } from './digest';
import { findEvent, type MatchQuery } from './event-lookup';
import { trackFailure } from './job-tracker';
import { onWarn } from './log';
import { startPoller } from './poll';
import { createRevalidator } from './revalidate';

// R9: pipe log warnings containing "failed" into job-tracker
onWarn((msg) => {
  const job = msg.match(/^([\w-]+):/)?.[1] ?? 'unknown';
  trackFailure(job, msg);
});
import { startBuzzCron } from './buzz';
import { publishAnalysisForPick, startAnalysisCron } from './news';
import { computeRecord, generateRecap, generateRecapArticle } from './recap';
import { publishPreview } from './preview';
import { publishThesisTranslations } from './translate';
import type { AnnounceArticleDeps } from './announce-article';
import { getFinalScore } from './scores';
import { createStore, type PickRow } from './store';
import { log } from './log';
import { createClient } from '@supabase/supabase-js';
import { persistMatchState, fetchLivescoreForPersist, seedFromGlMatches, detectFinishedMatches } from './persist-state';
import { startBoothShadow } from './booth-shadow';
import { createIndexNowPinger } from './indexnow';
import { checkDailyLineHealth } from './dl-monitor';
import { generatePostmortemDraft } from './postmortem';
import { runProviderMatcher } from './provider-matcher';
import { ingestFixtures } from './fixture-ingest';
import { linkPickToFixture, linkWatchingToFixture } from './fixture-link';
import { enqueueJob, processJobs, retryStaleJobs, type HandlerMap } from './job-queue';

const token = process.env.CURATOR_BOT_TOKEN;
if (!token) {
  log.error('CURATOR_BOT_TOKEN is required');
  process.exit(1);
}
const allowlist = parseAllowlist(process.env.CURATOR_USER_IDS ?? '');
if (allowlist.size === 0) log.warn('CURATOR_USER_IDS is empty — the bot will ignore everyone');

const channelChatId = process.env.CHANNEL_CHAT_ID;
const store = createStore(process.env);

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) log.warn('ANTHROPIC_API_KEY unset — AI recap + newsroom disabled');
const aiEnv = { apiKey: anthropicApiKey, model: process.env.RECAP_MODEL };
const recap = anthropicApiKey
  ? async (pick: PickRow) => {
      const settled = await store.listByStatus(['won', 'lost', 'push', 'void'], pick.author);
      return generateRecap(aiEnv, pick, computeRecord(settled));
    }
  : undefined;
const recapArticle = anthropicApiKey
  ? async (pick: PickRow) => {
      const settled = await store.listByStatus(['won', 'lost', 'push', 'void'], pick.author);
      return generateRecapArticle(aiEnv, pick, computeRecord(settled));
    }
  : undefined;
const siteUrl = process.env.SITE_URL ?? 'https://www.wildlyplay.com';
const fbPageId = process.env.FB_PAGE_ID;
const fbPageToken = process.env.FB_PAGE_TOKEN;
if (!fbPageId || !fbPageToken) log.warn('FB_PAGE_ID/FB_PAGE_TOKEN unset — Facebook posting disabled');
const facebook = fbPageId && fbPageToken ? { pageId: fbPageId, pageToken: fbPageToken } : undefined;

const translateThesis = anthropicApiKey
  ? (pick: PickRow) => publishThesisTranslations({ store, env: aiEnv }, pick)
  : undefined;
const analysisEnv = { apiKey: anthropicApiKey, model: process.env.ANALYSIS_MODEL };
// Post Restructure v1 (R6): preview + analysis articles are web/SEO-only — no announce deps.
const preview = anthropicApiKey
  ? (pick: PickRow) => publishPreview({ store, env: aiEnv }, pick)
  : undefined;
const publishAnalysis = anthropicApiKey
  ? (pick: PickRow) => publishAnalysisForPick({ store, env: analysisEnv, revalidateUrl: siteUrl }, pick)
  : undefined;

// Event auto-attach at /pick time — gated on the same key as the poller.
const oddsApiKey = process.env.ODDS_API_KEY;
const lookupEvent = oddsApiKey
  ? (pick: MatchQuery) => findEvent({ apiKey: oddsApiKey }, pick)
  : undefined;

// On-demand web cache busting (Nick 13/6) — Board/Archive lagged up to ~10 min after settle.
const revalidate = createRevalidator({ siteUrl, secret: process.env.REVALIDATE_SECRET });
const pingIndexNow = createIndexNowPinger({ siteUrl, secret: process.env.REVALIDATE_SECRET });

// Supabase client for durable job queue + persist-state (must be before onApprove)
const persistDb = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const postmortem = anthropicApiKey ? { store, env: aiEnv } : undefined;
const onApprove = persistDb ? async (pickId: string) => {
  void enqueueJob(persistDb!, 'postmortem-article', { pickId }).catch((e) => log.warn('enqueue postmortem-article failed:', e));
} : undefined;
const bot = createBot({ token, allowlist, store, channelChatId, recap, recapArticle, preview, translateThesis, publishAnalysis, findEvent: lookupEvent, siteUrl, facebook, revalidate, aiEnv, postmortem, onApprove });

let stopPoller: () => void = () => {};
if (oddsApiKey) {
  stopPoller = startPoller({
    store,
    getScore: (eventId) => getFinalScore(eventId, oddsApiKey),
    getOdds: (eventId) => fetchOddsPayload(eventId, oddsApiKey),
    onSettled: async (pick) => {
      void revalidate(['picks', 'posts']);
      // SEO: ping IndexNow for the settled play + recap article pages
      const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      void pingIndexNow([
        `/play/${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.selection.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pick.kickoff_utc.slice(0, 10)}`,
        `/news/recap-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.home_score}-${pick.away_score}`,
      ]);
      // T5: durable post-mortem draft — enqueue instead of fire-and-forget
      if (postmortem && persistDb) {
        void enqueueJob(persistDb, 'postmortem', { pickId: pick.id }).catch((e) => log.warn('enqueue postmortem failed:', e));
      }
      await announceResult({ api: bot.api, channelChatId, store, siteUrl, facebook, recap, recapArticle }, pick);
    },
  });
} else {
  log.warn('ODDS_API_KEY unset — auto-settlement disabled, use /score');
}

// Weekly digest (batch 4): Sundays 13:00 UTC → TG channel + FB Page.
const stopDigest = startWeeklyDigest({ api: bot.api, store, channelChatId, siteUrl, facebook });

// Analysis cron (M5): auto-generate analysis articles, ENV-driven cadence.
// Separate env from recap — analysis uses Sonnet (not RECAP_MODEL which is Haiku).
const stopAnalysis = anthropicApiKey
  ? startAnalysisCron({ store, env: { apiKey: anthropicApiKey, model: process.env.ANALYSIS_MODEL }, revalidateUrl: siteUrl })
  : () => {};

// Buzz cron (v2): community sentiment snapshots for watched matches, every 3h + pre-kickoff.
const stopBuzz = startBuzzCron({ store, env: aiEnv, revalidate });

// R3: Persist live match state — adaptive interval: 2 min when matches live, 10 min idle.
const PERSIST_FAST = 2 * 60_000;
const PERSIST_SLOW = 10 * 60_000;
let hasLiveMatches = false;
const persistTick = async () => {
  if (!persistDb) return;
  const matches = await fetchLivescoreForPersist(process.env);
  await persistMatchState(persistDb, matches);
  const feedIds = new Set(matches.map((m) => m.id));
  await detectFinishedMatches(persistDb, feedIds);
  const nowLive = matches.some((m) => m.status === 'live');
  if (nowLive !== hasLiveMatches) {
    hasLiveMatches = nowLive;
    clearInterval(persistTimer);
    persistTimer = setInterval(() => void persistTick(), hasLiveMatches ? PERSIST_FAST : PERSIST_SLOW);
    log.info(`persist-state: switched to ${hasLiveMatches ? '2min (live)' : '10min (idle)'} interval`);
  }
  if (matches.some((m) => m.status === 'live' || m.status === 'finished')) {
    void revalidate(['matches', 'picks', 'watching']);
  }
};
void persistTick();
if (persistDb) void seedFromGlMatches(persistDb);
// M2: provider mapping — run on boot + every 6h
if (persistDb && oddsApiKey && process.env.LIVESCORE_API_KEY && process.env.LIVESCORE_API_SECRET) {
  void runProviderMatcher(persistDb, oddsApiKey, process.env.LIVESCORE_API_KEY, process.env.LIVESCORE_API_SECRET)
    .then(() => ingestFixtures(persistDb!));
  setInterval(async () => {
    await runProviderMatcher(persistDb!, oddsApiKey!, process.env.LIVESCORE_API_KEY!, process.env.LIVESCORE_API_SECRET!);
    await ingestFixtures(persistDb!);
  }, 6 * 3_600_000);
  log.info('provider-matcher: boot + every 6h');
}
let persistTimer = setInterval(() => void persistTick(), PERSIST_SLOW);
if (persistDb) log.info('persist-state cron started (every 10 min)');
else log.warn('SUPABASE_URL unset — persist-state disabled');

// ── Daily Line gradual seed (every 30 min) ──
const SEED_INTERVAL = 30 * 60_000;
if (siteUrl && process.env.REVALIDATE_SECRET) {
  const seedTick = async () => {
    try {
      const res = await fetch(`${siteUrl}/api/goalline/seed-tick`, {
        method: 'POST',
        headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET! },
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results ?? [];
        for (const r of results) {
          if (r.added > 0) log.info(`seed-tick: card #${r.card} +${r.added} (total ${r.total}/${r.target})`);
        }
      }
    } catch { /* silent */ }
  };
  setInterval(() => void seedTick(), SEED_INTERVAL);
  void seedTick(); // immediate first tick
  log.info('seed-tick: cron started (every 30 min)');
}

// ── The Booth P1a: shadow commentary gen (admin-only, NOT public) ──
const stopBooth = persistDb && anthropicApiKey
  ? startBoothShadow({ supabase: persistDb, apiKey: anthropicApiKey })
  : () => {};
if (!persistDb || !anthropicApiKey) log.warn('booth-shadow: disabled (missing SUPABASE_URL or ANTHROPIC_API_KEY)');

// ── Durable job queue: recover stale + process every 60s ──
const jobHandlers: HandlerMap = {};
let jobQueueTimer: ReturnType<typeof setInterval> | null = null;
if (persistDb) {
  // Register handlers (closures capture store, aiEnv, etc.)
  jobHandlers['note-translate'] = async (payload) => {
    const { watchingId } = payload as { watchingId: string };
    const all = await store.getActiveWatching();
    const w = all.find((r) => r.id === watchingId);
    if (!w) throw new Error(`watching ${watchingId} not found`);
    await translateWatchingNote({ store, env: aiEnv }, w);
  };
  jobHandlers['watching-news'] = async (payload) => {
    // reason = hand-written card hook (R5) — card-only, rides the payload since the row doesn't persist it
    const { watchingId, reason } = payload as { watchingId: string; reason?: string | null };
    const all = await store.getActiveWatching();
    const w = all.find((r) => r.id === watchingId);
    if (!w) throw new Error(`watching ${watchingId} not found`);
    await publishWatchingNews({
      store, env: aiEnv, revalidateUrl: siteUrl,
      card: { api: bot.api, channelChatId, siteUrl },
    }, w, reason);
  };
  jobHandlers['postmortem'] = async (payload) => {
    const { pickId } = payload as { pickId: string };
    const pick = await store.getPick(pickId);
    if (!pick) throw new Error(`pick ${pickId} not found`);
    if (!postmortem) throw new Error('postmortem deps unavailable');
    await generatePostmortemDraft(postmortem, pick);
  };
  jobHandlers['postmortem-article'] = async (payload) => {
    const { pickId } = payload as { pickId: string };
    const pick = await store.getPick(pickId);
    if (!pick) throw new Error(`pick ${pickId} not found`);
    const { publishPostmortemArticle } = await import('./postmortem-article');
    const articleDeps: AnnounceArticleDeps = { api: bot.api, channelChatId, store, siteUrl, facebook };
    await publishPostmortemArticle({ store, env: aiEnv, revalidateUrl: siteUrl, announceArticle: articleDeps }, pick);
  };

  void retryStaleJobs(persistDb);
  jobQueueTimer = setInterval(() => void processJobs(persistDb!, jobHandlers), 60_000);
  log.info('job-queue: started (poll every 60s)');
}

void bot.start({
  onStart: (me) => log.info(`Curator bot started as @${me.username} (long polling)`),
});

// ── Admin webhook (Nick 18/6): trigger watching/pick pipeline from dashboard ──
import { createServer } from 'node:http';
import { translateWatchingNote } from './buzz-note';
import { generateBuzz } from './buzz';
import { publishWatchingNews } from './watching-news';
import { announcePick } from './announce-pick';
import { handleApiRoute } from './api-routes';

const WEBHOOK_SECRET = process.env.REVALIDATE_SECRET ?? '';
const webhookPort = Number(process.env.WEBHOOK_PORT ?? process.env.PORT ?? '8080');

const server = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end('Method not allowed');
    return;
  }
  // Auth check
  if (WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    res.writeHead(401).end('Unauthorized');
    return;
  }

  const body = await new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk; });
    req.on('end', () => resolve(data));
  });

  try {
    const payload = JSON.parse(body);

    if (req.url === '/webhook/watching' && payload.watchingId) {
      const watching = await store.getActiveWatching().then(
        (all) => all.find((w) => w.id === payload.watchingId)
      );
      if (!watching) {
        // Try fetching by updating — might be newly inserted
        res.writeHead(404).end(JSON.stringify({ error: 'watching not found or not active' }));
        return;
      }
      log.info(`webhook: triggering pipeline for watching ${watching.id} (${watching.home_team} vs ${watching.away_team})`);

      // Same pipeline as bot /watching command — durable queue for AI jobs
      if (aiEnv.apiKey && persistDb) {
        void enqueueJob(persistDb, 'note-translate', { watchingId: watching.id }).catch((e) => log.warn('enqueue note-translate failed:', e));
        void enqueueJob(persistDb, 'watching-news', { watchingId: watching.id }).catch((e) => log.warn('enqueue watching-news failed:', e));
        // Buzz still runs inline (fast, not AI-heavy)
        void (async () => {
          try {
            const snapshot = await generateBuzz({ store, env: aiEnv }, watching);
            if (snapshot) {
              await store.updateWatching(watching.id, { buzz_history: [snapshot] });
              void revalidate(['watching']);
            }
          } catch (err) { log.warn(`webhook buzz failed:`, err); }
        })();
      } else if (aiEnv.apiKey) {
        // Fallback: no persistDb, fire-and-forget like before
        void translateWatchingNote({ store, env: aiEnv }, watching);
        void publishWatchingNews({
          store, env: aiEnv, revalidateUrl: siteUrl,
          card: { api: bot.api, channelChatId, siteUrl },
        }, watching);
      }
      void revalidate(['watching']);
      res.writeHead(200).end(JSON.stringify({ ok: true }));
      return;
    }

    // Pick pipeline webhook (Nick 18/6): trigger preview + analysis + announce after admin creates a pick
    if (req.url === '/webhook/pick' && payload.pickId) {
      const pick = await store.getPick(payload.pickId);
      if (!pick) {
        res.writeHead(404).end(JSON.stringify({ error: 'pick not found' }));
        return;
      }
      log.info(`webhook: triggering pipeline for pick ${pick.id} (${pick.home_team} vs ${pick.away_team})`);

      // Same pipeline as bot /pick command
      if (preview) void preview(pick);
      if (translateThesis) void translateThesis(pick);
      if (publishAnalysis && pick.publish_score_home == null) void publishAnalysis(pick);
      void announcePick({ api: bot.api, channelChatId, store, siteUrl, facebook }, pick);
      void revalidate(['picks']);
      res.writeHead(200).end(JSON.stringify({ ok: true }));
      return;
    }

    // Full API routes (all Curator commands)
    const apiDeps = {
      store, aiEnv, siteUrl, facebook, revalidate,
      findEvent: lookupEvent,
      preview, translateThesis, publishAnalysis,
      postmortem: anthropicApiKey ? { store, env: aiEnv } : undefined,
      onApprove: persistDb ? async (pickId: string) => {
        void enqueueJob(persistDb!, 'postmortem-article', { pickId }).catch(e => log.warn('enqueue postmortem-article:', e));
      } : undefined,
      announceDeps: { api: bot.api, channelChatId, store, siteUrl, facebook },
      persistDb,
      recap, recapArticle: recapArticle,
    };
    const handled = await handleApiRoute(req, res, body, apiDeps);
    if (handled) return;

    res.writeHead(400).end(JSON.stringify({ error: 'unknown route' }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`webhook error: ${msg}`);
    if (!res.headersSent) res.writeHead(500).end(JSON.stringify({ error: msg }));
  }
});

server.listen(webhookPort, () => {
  log.info(`webhook server listening on port ${webhookPort}`);
});

// ── GoalLine Daily cron: auto-lock + settle every 15 min ──
const GL_CRON_INTERVAL = 15 * 60 * 1000; // 15 minutes
const glCronUrl = `${siteUrl}/api/goalline/cron`;
const glCronSecret = process.env.REVALIDATE_SECRET ?? '';
const glLastCronSuccess = { ts: 0 };

let glCronRunning = false;
const glCronTimer = setInterval(async () => {
  if (glCronRunning) return; // skip if previous run still going
  glCronRunning = true;
  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 60_000); // 60s timeout
    const res = await fetch(glCronUrl, {
      method: 'POST',
      headers: { 'x-revalidate-secret': glCronSecret },
      signal: ac.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      log.warn(`GoalLine cron: HTTP ${res.status}`);
    } else {
      const data = await res.json();
      glLastCronSuccess.ts = Date.now();
      const hasActivity = data.create?.done || data.locked?.length || data.settle?.settled?.length || data.settle?.voided?.length;
      if (hasActivity) {
        log.info(`GoalLine cron: ${JSON.stringify(data)}`);
      } else {
        log.info(`GoalLine cron: ok (no activity) — create: ${data.create?.reason ?? 'n/a'}`);
      }
    }
  } catch (err) {
    log.warn('GoalLine cron failed:', err);
  } finally {
    glCronRunning = false;
  }
}, GL_CRON_INTERVAL);

log.info('GoalLine cron started (every 15 min)');

// ── R5: Daily Line settlement monitor (every 15 min) ──
const DL_MONITOR_INTERVAL = 15 * 60 * 1000;
const dlMonitorTimer = persistDb
  ? setInterval(() => void checkDailyLineHealth({
      db: persistDb,
      botToken: token,
      lastCronSuccess: glLastCronSuccess,
    }), DL_MONITOR_INTERVAL)
  : null;
if (dlMonitorTimer) log.info('dl-monitor started (every 15 min)');
else log.warn('dl-monitor disabled — no Supabase client');

async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received — shutting down`);
  clearInterval(glCronTimer);
  if (dlMonitorTimer) clearInterval(dlMonitorTimer);
  clearInterval(persistTimer);
  if (jobQueueTimer) clearInterval(jobQueueTimer);
  stopPoller();
  stopDigest();
  stopAnalysis();
  stopBuzz();
  await bot.stop();
  log.info('shutdown complete');
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
