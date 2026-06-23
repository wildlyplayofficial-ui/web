/**
 * M3: AI Analysis Pipeline — auto-generate analysis articles from own data.
 * Mirrors recap.ts patterns: callClaude, split lang sections, build posts, insert.
 * Model: Claude Sonnet (higher quality than Haiku used for recaps).
 */
import type { NewPost, PostLang, PickRow, Store } from './store';
import { callClaude, computeRecord, POST_FLAGS, slugify, splitLangSections, type SettledRecord } from './recap';
import { announceArticle, type AnnounceArticleDeps } from './announce-article';
import { log } from './log';
import { createRevalidator } from './revalidate';

// Sonnet 4.6 unavailable on current API key — use Haiku until key upgraded
export const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 6000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisTopic {
  fixture_id: number;
  league: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  related_pick_ids: string[];
  has_pick: boolean;
  /** Pick data when available. */
  pick: PickRow | null;
}

export interface AnalysisContext {
  topic: AnalysisTopic;
  record: SettledRecord;
  /** Pluggable external facts (injury/lineup/H2H). Empty in v1, RSS in later phase. */
  facts: string[];
}

interface ParsedAnalysisLang {
  meta_title: string;
  meta_description: string;
  target_keyword: string;
  body: string;
}

// ── Topic Selection ──────────────────────────────────────────────────────────

/** Select analysis topics from recent/upcoming picks. Dedup by fixture_id against existing slugs. */
export function selectAnalysisTopics(
  picks: PickRow[],
  existingSlugs: Set<string>,
  cap: number = 2,
): AnalysisTopic[] {
  const now = Date.now();
  const topics: AnalysisTopic[] = [];
  const seenFixtures = new Set<number>();

  // Only picks for matches NOT YET STARTED (pre-match analysis only)
  const upcoming = picks.filter((p) => new Date(p.kickoff_utc).getTime() > now);

  // Sort: soonest first (within 24h priority)
  const sorted = [...upcoming].sort((a, b) => {
    const aTime = new Date(a.kickoff_utc).getTime();
    const bTime = new Date(b.kickoff_utc).getTime();
    const aUrgent = aTime - now < 24 * 60 * 60 * 1000;
    const bUrgent = bTime - now < 24 * 60 * 60 * 1000;
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
    return aTime - bTime;
  });

  for (const pick of sorted) {
    if (topics.length >= cap) break;
    if (seenFixtures.has(pick.fixture_id)) continue;

    const slug = buildAnalysisSlug(pick.home_team, pick.away_team, pick.kickoff_utc);
    if (existingSlugs.has(slug)) continue;

    seenFixtures.add(pick.fixture_id);
    topics.push({
      fixture_id: pick.fixture_id,
      league: pick.league,
      home_team: pick.home_team,
      away_team: pick.away_team,
      kickoff_utc: pick.kickoff_utc,
      related_pick_ids: [pick.id],
      has_pick: true,
      pick,
    });
  }

  return topics;
}

// ── Slug ─────────────────────────────────────────────────────────────────────

export function buildAnalysisSlug(home: string, away: string, kickoff?: string): string {
  const date = kickoff ? new Date(kickoff).toISOString().slice(0, 10) : '';
  const suffix = date ? `-${date}` : '';
  return `analysis-${slugify(home)}-vs-${slugify(away)}${suffix}`;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export function buildAnalysisPrompt(ctx: AnalysisContext): string {
  const { topic, record, facts } = ctx;
  const units = record.units > 0 ? `+${record.units}` : `${record.units}`;
  const kickoff = new Date(topic.kickoff_utc).toISOString().slice(0, 16).replace('T', ' ');

  const pickInfo = topic.pick
    ? [
        `- Our pick: ${topic.pick.selection} @ ${topic.pick.odds_publish} (market: ${topic.pick.market}, line: ${topic.pick.line ?? 'n/a'}, stake: ${Number(topic.pick.stake_units)} units)`,
        `- Curator's thesis: ${topic.pick.thesis}`,
      ]
    : ['- No pick placed — this is an analysis-only preview (state this clearly).'];

  const factsBlock = facts.length > 0
    ? ['', 'External facts (verified):', ...facts.map((f) => `- ${f}`)]
    : [];

  return [
    'You write pre-match analysis articles for the WildlyPlay newsroom (wildlyplay.com/news), a football picks site by "The Curator".',
    '',
    'Match:',
    `- ${topic.home_team} vs ${topic.away_team}`,
    `- League: ${topic.league}`,
    `- Kickoff: ${kickoff} UTC`,
    ...pickInfo,
    `- Channel record: ${record.won}-${record.lost}-${record.push} (W-L-P), ${units} units total`,
    ...factsBlock,
    '',
    'Write a pre-match analysis with exactly FOUR language sections, in this order:',
    `English under ${POST_FLAGS.en}, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.`,
    '',
    'Each section MUST start with these 3 lines (EXACTLY this format, each on its own line):',
    '[META_TITLE] <SEO title under 60 chars with primary keyword>',
    '[META_DESC] <meta description 150-160 chars>',
    '[KEYWORD] <primary target keyword>',
    'Then a blank line, then the article body (150-250 words, markdown, no H1).',
    '',
    'Rules:',
    '- Work ONLY from the data above — do not invent injuries, quotes, stats or events you cannot verify.',
    '- Do NOT make claims about team form, historical results, head-to-head, injuries, lineups or player condition UNLESS explicitly provided in the data above. If you lack data for a point, omit it — do not speculate.',
    topic.has_pick
      ? '- This is a PICK ANALYSIS — discuss why The Curator chose this selection, the odds value, and what to watch for.'
      : '- This is an ANALYSIS ONLY (no pick) — state clearly this is editorial analysis, NOT a recommendation.',
    '- Responsible language: NEVER use "sure win", "guaranteed", "can\'t lose", "lock", "certainty" or any promise of profit.',
    '- Include a one-line responsible gambling note at the end of each section.',
    '- End each section with disclosure as plain text (no bold, no italic, no markdown formatting): Human-data, AI-written — The Curator @ WildlyPlay',
    '- Do NOT copy any external source verbatim.',
  ].join('\n');
}

// ── Parse ─────────────────────────────────────────────────────────────────────

const META_TITLE_RE = /^\[META_TITLE\]\s*(.+)$/m;
const META_DESC_RE = /^\[META_DESC\]\s*(.+)$/m;
const KEYWORD_RE = /^\[KEYWORD\]\s*(.+)$/m;

/** Parse a single language section into meta fields + body. */
export function parseAnalysisSection(text: string): ParsedAnalysisLang | null {
  const titleMatch = META_TITLE_RE.exec(text);
  const descMatch = META_DESC_RE.exec(text);
  const kwMatch = KEYWORD_RE.exec(text);

  if (!titleMatch || !descMatch || !kwMatch) return null;

  // Body = everything after the 3 meta lines
  const lastMetaEnd = Math.max(
    (titleMatch.index ?? 0) + titleMatch[0].length,
    (descMatch.index ?? 0) + descMatch[0].length,
    (kwMatch.index ?? 0) + kwMatch[0].length,
  );
  const body = text.slice(lastMetaEnd).trim();

  return {
    meta_title: titleMatch[1].trim(),
    meta_description: descMatch[1].trim(),
    target_keyword: kwMatch[1].trim(),
    body,
  };
}

/** Split AI output into per-language sections with meta fields. */
export function splitAnalysisSections(
  text: string,
): Partial<Record<PostLang, ParsedAnalysisLang>> | null {
  const langSections = splitLangSections(text);
  if (!langSections) return null;

  const parsed: Partial<Record<PostLang, ParsedAnalysisLang>> = {};
  for (const [lang, body] of Object.entries(langSections) as [PostLang, string][]) {
    const section = parseAnalysisSection(body);
    if (section) parsed[lang] = section;
  }

  return parsed.en ? parsed : null;
}

// ── Build Posts ──────────────────────────────────────────────────────────────

export function buildAnalysisPosts(
  topic: AnalysisTopic,
  text: string,
  facts: string[],
): NewPost[] {
  const slug = buildAnalysisSlug(topic.home_team, topic.away_team, topic.kickoff_utc);
  const now = new Date().toISOString();
  const sourceRefs = facts.length > 0 ? { facts, gathered_at: now } : null;

  const sections = splitAnalysisSections(text);
  if (!sections) {
    return [{
      type: 'analysis',
      slug,
      lang: 'en',
      title: `Analysis: ${topic.home_team} vs ${topic.away_team}`,
      body_md: text.trim(),
      pick_ids: topic.related_pick_ids,
      status: 'published',
      published_at: now,
      meta_title: null,
      meta_description: null,
      target_keyword: null,
      source_refs: sourceRefs,
    }];
  }

  return (Object.entries(sections) as [PostLang, ParsedAnalysisLang][]).map(([lang, section]) => ({
    type: 'analysis' as const,
    slug,
    lang,
    title: section.meta_title,
    body_md: section.body,
    pick_ids: topic.related_pick_ids,
    status: 'published' as const,
    published_at: now,
    meta_title: section.meta_title,
    meta_description: section.meta_description,
    target_keyword: section.target_keyword,
    source_refs: sourceRefs,
  }));
}

// ── On-demand (pick-triggered) ──────────────────────────────────────────

export interface PublishAnalysisDeps {
  store: Store;
  env: AnalysisEnv;
  revalidateUrl?: string;
  announceArticle?: AnnounceArticleDeps;
}

/** Generate + publish an analysis article for a single pick. Fire-and-forget: never throws.
 *  Skips silently when analysis already exists for this fixture or API key is unset. */
export async function publishAnalysisForPick(
  deps: PublishAnalysisDeps,
  pick: PickRow,
): Promise<void> {
  try {
    if (!deps.env.apiKey) return;

    const slug = buildAnalysisSlug(pick.home_team, pick.away_team, pick.kickoff_utc);
    const existingSlugs = await deps.store.listPostSlugsByType('analysis');
    if (existingSlugs.has(slug)) {
      log.info(`analysis: slug "${slug}" already exists — skipping`);
      return;
    }

    const allPicks = await deps.store.listByStatus(['won', 'lost', 'push']);
    const record = computeRecord(allPicks);

    const topic: AnalysisTopic = {
      fixture_id: pick.fixture_id,
      league: pick.league,
      home_team: pick.home_team,
      away_team: pick.away_team,
      kickoff_utc: pick.kickoff_utc,
      related_pick_ids: [pick.id],
      has_pick: true,
      pick,
    };

    const posts = await generateAnalysis(deps.env, { topic, record, facts: [] });
    if (!posts || posts.length === 0) return;

    for (const post of posts) {
      await deps.store.insertPost(post);
    }
    log.info(`analysis: published ${posts.length} posts for pick ${pick.id} (on-demand)`);
    const enPost = posts.find((p) => p.lang === 'en');
    if (enPost && deps.announceArticle) void announceArticle(deps.announceArticle, enPost);

    if (deps.revalidateUrl) {
      const revalidate = createRevalidator({
        siteUrl: deps.revalidateUrl,
        secret: process.env.REVALIDATE_SECRET,
      });
      await revalidate(['posts']);
    }
  } catch (err) {
    log.warn(`analysis: on-demand publish failed for pick ${pick.id}:`, err);
  }
}

// ── Cron ─────────────────────────────────────────────────────────────────

/** Default 12h interval + cap 1/run + max 2/day. Override via ENV. */
export const DEFAULT_INTERVAL_H = 12;
export const DEFAULT_CAP = 1;
export const DEFAULT_DAILY_MAX = 2;

export interface AnalysisCronDeps {
  store: Store;
  env: AnalysisEnv;
  revalidateUrl: string;
  intervalH?: number;
  cap?: number;
  announceArticle?: AnnounceArticleDeps;
}

/** Start analysis cron loop. Returns stop function (for graceful shutdown). */
export function startAnalysisCron(deps: AnalysisCronDeps): () => void {
  const { store, env, revalidateUrl } = deps;
  const intervalH = deps.intervalH ?? (Number(process.env.ANALYSIS_INTERVAL_H) || DEFAULT_INTERVAL_H);
  const cap = deps.cap ?? (Number(process.env.ANALYSIS_CAP) || DEFAULT_CAP);
  const intervalMs = intervalH * 60 * 60_000;

  if (!env.apiKey) {
    log.warn('analysis cron: ANTHROPIC_API_KEY unset — disabled');
    return () => {};
  }

  log.info(`analysis cron: started (interval ${intervalMs / 60_000}min, cap ${cap}/run)`);

  const run = async () => {
    try {
      const published = await runAnalysisPipeline({ env, store, revalidateUrl, cap, announceArticle: deps.announceArticle });
      if (published > 0) log.info(`analysis cron: published ${published} posts`);
    } catch (err) {
      log.warn('analysis cron: pipeline error:', err);
    }
  };

  // First run after 30s startup delay (let bot/poller stabilize)
  const startupTimer = setTimeout(() => void run(), 30_000);
  const interval = setInterval(() => void run(), intervalMs);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(interval);
    log.info('analysis cron: stopped');
  };
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

export interface AnalysisEnv {
  apiKey: string | undefined;
  model?: string;
}

/** Generate analysis for a single topic. Returns posts or null on failure. Never throws. */
export async function generateAnalysis(
  env: AnalysisEnv,
  ctx: AnalysisContext,
): Promise<NewPost[] | null> {
  const label = `${ctx.topic.home_team} vs ${ctx.topic.away_team}`;
  log.info(`analysis: generating for ${label}`);

  const text = await callClaude(
    { apiKey: env.apiKey, model: env.model ?? ANALYSIS_MODEL },
    buildAnalysisPrompt(ctx),
    `analysis ${label}`,
    MAX_TOKENS,
  );

  if (!text) return null;

  const posts = buildAnalysisPosts(ctx.topic, text, ctx.facts);
  log.info(`analysis: built ${posts.length} posts for ${label}`);
  return posts;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface AnalysisPipelineConfig {
  env: AnalysisEnv;
  store: Store;
  revalidateUrl?: string;
  cap?: number;
  dailyMax?: number;
  announceArticle?: AnnounceArticleDeps;
}

/** Full pipeline: select topics → generate → insert → revalidate. Fail-safe per topic. */
export async function runAnalysisPipeline(config: AnalysisPipelineConfig): Promise<number> {
  const { env, store, revalidateUrl, cap = 2, dailyMax = DEFAULT_DAILY_MAX } = config;
  const revalidate = revalidateUrl
    ? createRevalidator({ siteUrl: revalidateUrl, secret: process.env.REVALIDATE_SECRET })
    : null;

  // Daily cap: count analysis posts PUBLISHED today (UTC), not by slug date
  const todayCount = await store.countPostsTodayByType('analysis');
  if (todayCount >= dailyMax) {
    log.info(`analysis: daily cap reached (${todayCount}/${dailyMax}) — skipping`);
    return 0;
  }
  const remainingCap = Math.min(cap, dailyMax - todayCount);

  // Dedup: existing analysis slugs to avoid regenerating
  const existingSlugs = await store.listPostSlugsByType('analysis');

  // Get recent picks for topic selection + record
  const allPicks = await store.listByStatus(['published', 'won', 'lost', 'push']);
  const settledPicks = allPicks.filter((p) => ['won', 'lost', 'push'].includes(p.status));
  const record = computeRecord(settledPicks);

  // Get existing analysis slugs for dedup
  // Pick published/draft picks that could be topics
  const candidatePicks = allPicks.filter(
    (p) => p.status === 'published' || ['won', 'lost', 'push'].includes(p.status),
  );

  const topics = selectAnalysisTopics(candidatePicks, existingSlugs, remainingCap);
  if (topics.length === 0) {
    log.info('analysis: no topics found');
    return 0;
  }

  let published = 0;
  for (const topic of topics) {
    try {
      const ctx: AnalysisContext = { topic, record, facts: [] };
      const posts = await generateAnalysis(env, ctx);
      if (!posts || posts.length === 0) continue;

      for (const post of posts) {
        await store.insertPost(post);
      }
      published += posts.length;
      log.info(`analysis: inserted ${posts.length} posts for ${topic.home_team} vs ${topic.away_team}`);
      const enPost = posts.find((p) => p.lang === 'en');
      if (enPost && config.announceArticle) void announceArticle(config.announceArticle, enPost);
    } catch (err) {
      log.warn(`analysis: failed for ${topic.home_team} vs ${topic.away_team}:`, err);
    }
  }

  if (published > 0 && revalidate) {
    await revalidate(['posts']);
    log.info(`analysis: revalidated (${published} posts published)`);
  }

  return published;
}
