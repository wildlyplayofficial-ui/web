/**
 * Watching-triggered news article: when The Curator adds a /watching entry,
 * auto-generate a neutral pre-match preview article for SEO and publish to /news.
 * A news failure must NEVER break the watching pipeline — every path logs and returns.
 */
import type { Api } from 'grammy';
import { callClaude, DEFAULT_MODEL, disclosureBlock, POST_FLAGS, slugify, validate4Lang } from './recap';
import { splitAnalysisSections, parseAnalysisSection } from './news';
import { buildArticleLink } from './announce-article';
import type { NewPost, PostLang, Store, WatchingRow } from './store';
import { authorTypeOf } from './store';
import { createRevalidator } from './revalidate';
import { log } from './log';

const MAX_TOKENS = 6000;

// ── Slug ────────────────────────────────────────────────────────────────────

export function buildNewsSlug(home: string, away: string, kickoff: string): string {
  const date = new Date(kickoff).toISOString().slice(0, 10);
  return `news-${slugify(home)}-vs-${slugify(away)}-${date}`;
}

// ── Prompt ───────────────────────────────────────────────────────────────────

export function buildWatchingNewsPrompt(w: WatchingRow): string {
  const kickoff = new Date(w.kickoff_utc).toISOString().slice(0, 16).replace('T', ' ');

  return [
    'You write neutral, informative pre-match preview articles for the WildlyPlay newsroom (wildlyplay.com/news).',
    '',
    'Match:',
    `- ${w.home_team} vs ${w.away_team}`,
    `- League: ${w.league}`,
    `- Kickoff: ${kickoff} UTC`,
    w.note ? `- Curator note: ${w.note}` : '',
    '',
    'Write a pre-match preview article with exactly FOUR language sections, in this order:',
    `English under ${POST_FLAGS.en}, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.`,
    '',
    'Each section MUST start with these 3 lines (EXACTLY this format, each on its own line):',
    '[META_TITLE] <SEO title under 60 chars with primary keyword>',
    '[META_DESC] <meta description 150-160 chars>',
    '[KEYWORD] <primary target keyword>',
    'Then a blank line, then the article body (400-600 words, markdown, no H1).',
    '',
    'ATOMIC ANSWER: The very first sentence of the article body (after the META lines) MUST be a self-contained factual statement — e.g. "' + w.home_team + ' face ' + w.away_team + ' in ' + w.league + ' on Matchday X, with both teams needing a result to advance." This sentence should be liftable by an AI search engine as a standalone answer.',
    '',
    'Cover: team form, key players to watch, tactical outlook, and what to watch for in this match.',
    '',
    'Rules:',
    '- Work ONLY from the data above plus your general football knowledge — do NOT invent specific injuries, quotes, transfer rumors, or match events you cannot verify.',
    '- Neutral and informative tone — this is editorial journalism, NOT a betting recommendation.',
    '- Responsible language: NEVER use "sure win", "guaranteed", "can\'t lose", "lock", "certainty" or any promise of profit.',
    '- End each section with this disclosure as plain text (no bold, no italic, no markdown formatting), matching that section\'s own language exactly:',
    disclosureBlock(authorTypeOf(w.author)),
    '- Do NOT copy any external source verbatim.',
  ].filter(Boolean).join('\n');
}

// ── Build Posts ──────────────────────────────────────────────────────────────

const NEWS_TITLES: Record<PostLang, string> = {
  en: 'Preview', vi: 'Trước trận', th: 'พรีวิว', es: 'Previa',
};

export function buildNewsPosts(w: WatchingRow, text: string): NewPost[] {
  const slug = buildNewsSlug(w.home_team, w.away_team, w.kickoff_utc);
  const matchup = `${w.home_team} vs ${w.away_team}`;
  const now = new Date().toISOString();

  const sections = splitAnalysisSections(text);
  if (!sections) {
    return [{
      type: 'news',
      slug,
      lang: 'en',
      title: `${NEWS_TITLES.en}: ${matchup}`,
      body_md: text.trim(),
      pick_ids: [],
      status: 'published',
      published_at: now,
      meta_title: null,
      meta_description: null,
      target_keyword: null,
      author: w.author,
    }];
  }

  return (Object.entries(sections) as [PostLang, ReturnType<typeof parseAnalysisSection> & object][])
    .map(([lang, section]) => ({
      type: 'news' as const,
      slug,
      lang,
      title: section.meta_title,
      body_md: section.body,
      pick_ids: [],
      author: w.author,
      status: 'published' as const,
      published_at: now,
      meta_title: section.meta_title,
      meta_description: section.meta_description,
      target_keyword: section.target_keyword,
    }));
}

// ── Publish ─────────────────────────────────────────────────────────────────

export interface WatchingCardDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  siteUrl: string;
}

export interface WatchingNewsDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
  revalidateUrl?: string;
  /** Post Restructure v1 §2.4: 3-line WATCHING card (TG only, replaces the article announce). */
  card?: WatchingCardDeps;
}

/** 3-line 👀 WATCHING card (Post Restructure Spec v1 §2.4, locked 3/7 — TG only).
 *  R5: the middle line is the hand-written one-sentence reason. NEVER w.note —
 *  the note feeds the article prompt and can be a long analysis/excerpt. */
export function formatWatchingMessage(
  w: WatchingRow,
  siteUrl: string,
  slug: string,
  reason?: string | null,
): string {
  const ko = new Date(w.kickoff_utc).toISOString().slice(11, 16);
  return [
    `\u{1F440} Watching \u2014 ${w.home_team} vs ${w.away_team} \u00b7 ${w.league} \u00b7 KO ${ko} UTC`,
    ...(reason ? [reason] : []),
    `\u{1F517} ${buildArticleLink(siteUrl, slug, 'telegram')}`,
  ].join('\n');
}

/** Send the WATCHING card to the TG channel. Fire-and-forget — never throws. */
async function sendWatchingCard(
  deps: WatchingCardDeps,
  w: WatchingRow,
  slug: string,
  reason?: string | null,
): Promise<void> {
  if (!deps.channelChatId) return;
  try {
    const msg = formatWatchingMessage(w, deps.siteUrl, slug, reason);
    const imageUrl = `${deps.siteUrl}/images/wildlyplay_watching.png`;
    try {
      await deps.api.sendPhoto(deps.channelChatId, imageUrl, { caption: msg });
    } catch {
      await deps.api.sendMessage(deps.channelChatId, msg);
    }
    log.info(`watching card sent for ${w.home_team} vs ${w.away_team}`);
  } catch (err) {
    log.warn(`watching card failed for ${w.home_team} vs ${w.away_team} — article already published:`, err);
  }
}

/** Generate + publish a news article for a /watching entry. Fire-and-forget: never throws.
 *  `reason` = hand-written one-sentence card hook (R5) — card-only, not persisted. */
export async function publishWatchingNews(
  deps: WatchingNewsDeps,
  watching: WatchingRow,
  reason?: string | null,
): Promise<void> {
  try {
    if (!deps.env.apiKey) return;

    const slug = buildNewsSlug(watching.home_team, watching.away_team, watching.kickoff_utc);
    const existingSlugs = await deps.store.listPostSlugsByType('news');
    if (existingSlugs.has(slug)) {
      log.info(`watching-news: slug "${slug}" already exists — skipping`);
      return;
    }

    const text = await callClaude(
      { apiKey: deps.env.apiKey, model: deps.env.model ?? DEFAULT_MODEL },
      buildWatchingNewsPrompt(watching),
      `watching-news ${watching.home_team} vs ${watching.away_team}`,
      MAX_TOKENS,
    );
    if (!text) return;

    const posts = buildNewsPosts(watching, text);
    // Validation guard: check all 4 langs have body before publishing
    const langBodies: Partial<Record<import('./store').PostLang, string>> = {};
    for (const p of posts) langBodies[p.lang as import('./store').PostLang] = p.body_md;
    const { ok, missing } = validate4Lang(langBodies);
    if (!ok) log.warn(`watching-news: incomplete langs [${missing.join(',')}] for ${watching.home_team} vs ${watching.away_team} — publishing available langs`);
    for (const post of posts) {
      await deps.store.insertPost(post);
    }
    log.info(`watching-news: published ${posts.length} posts for ${watching.home_team} vs ${watching.away_team}`);
    if (deps.card) await sendWatchingCard(deps.card, watching, slug, reason);

    if (deps.revalidateUrl) {
      const revalidate = createRevalidator({
        siteUrl: deps.revalidateUrl,
        secret: process.env.REVALIDATE_SECRET,
      });
      await revalidate(['posts']);
    }
  } catch (err) {
    log.warn(`watching-news: publish failed for watching ${watching.id}:`, err);
  }
}
