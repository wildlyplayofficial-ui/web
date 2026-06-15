/** Worker entrypoint: Curator bot (long polling) + results poller. */
import 'dotenv/config';
import { parseAllowlist } from './allowlist';
import { announceResult } from './announce';
import { createBot } from './bot';
import { fetchOddsPayload } from './clv';
import { startWeeklyDigest } from './digest';
import { findEvent, type MatchQuery } from './event-lookup';
import { startPoller } from './poll';
import { createRevalidator } from './revalidate';
import { startAnalysisCron } from './news';
import { computeRecord, generateRecap, generateRecapArticle } from './recap';
import { publishPreview } from './preview';
import { publishThesisTranslations } from './translate';
import { getFinalScore } from './scores';
import { createStore, type PickRow } from './store';
import { log } from './log';

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
      const settled = await store.listByStatus(['won', 'lost', 'push', 'void']);
      return generateRecap(aiEnv, pick, computeRecord(settled));
    }
  : undefined;
const recapArticle = anthropicApiKey
  ? async (pick: PickRow) => {
      const settled = await store.listByStatus(['won', 'lost', 'push', 'void']);
      return generateRecapArticle(aiEnv, pick, computeRecord(settled));
    }
  : undefined;
const preview = anthropicApiKey
  ? (pick: PickRow) => publishPreview({ store, env: aiEnv }, pick)
  : undefined;
const translateThesis = anthropicApiKey
  ? (pick: PickRow) => publishThesisTranslations({ store, env: aiEnv }, pick)
  : undefined;

const siteUrl = process.env.SITE_URL ?? 'https://www.wildlyplay.com';
const fbPageId = process.env.FB_PAGE_ID;
const fbPageToken = process.env.FB_PAGE_TOKEN;
if (!fbPageId || !fbPageToken) log.warn('FB_PAGE_ID/FB_PAGE_TOKEN unset — Facebook posting disabled');
const facebook = fbPageId && fbPageToken ? { pageId: fbPageId, pageToken: fbPageToken } : undefined;

// Event auto-attach at /pick time — gated on the same key as the poller.
const oddsApiKey = process.env.ODDS_API_KEY;
const lookupEvent = oddsApiKey
  ? (pick: MatchQuery) => findEvent({ apiKey: oddsApiKey }, pick)
  : undefined;

// On-demand web cache busting (Nick 13/6) — Board/Archive lagged up to ~10 min after settle.
const revalidate = createRevalidator({ siteUrl, secret: process.env.REVALIDATE_SECRET });

const bot = createBot({ token, allowlist, store, channelChatId, recap, recapArticle, preview, translateThesis, findEvent: lookupEvent, siteUrl, facebook, revalidate });

let stopPoller: () => void = () => {};
if (oddsApiKey) {
  stopPoller = startPoller({
    store,
    getScore: (eventId) => getFinalScore(eventId, oddsApiKey),
    getOdds: (eventId) => fetchOddsPayload(eventId, oddsApiKey),
    onSettled: async (pick) => {
      void revalidate(['picks', 'posts']);
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

void bot.start({
  onStart: (me) => log.info(`Curator bot started as @${me.username} (long polling)`),
});

async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received — shutting down`);
  stopPoller();
  stopDigest();
  stopAnalysis();
  await bot.stop();
  log.info('shutdown complete');
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
