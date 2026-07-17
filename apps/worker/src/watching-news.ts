/**
 * Watching-triggered news article: when The Curator adds a /watching entry,
 * auto-generate a neutral pre-match preview article for SEO and publish to /news.
 * A news failure must NEVER break the watching pipeline — every path logs and returns.
 */
import type { Api } from 'grammy';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, DEFAULT_MODEL, disclosureBlock, isPlaceholderTeam, POST_FLAGS, slugify, validate4Lang, watchingDisclosureBlock, watchingDisclosureFor } from './recap';
import { splitAnalysisSections, parseAnalysisSection } from './news';
import { buildArticleLink } from './announce-article';
import { postToFacebook } from './announce-pick';
import { postPhotoToFacebook } from './announce';
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
    '- Do NOT guess the tournament round/stage (e.g. "Round of 32", "Round of 16", "Quarter-final"). If the League field above does not specify the round, omit it entirely — a wrong round is worse than none.',
    '- Neutral and informative tone — this is editorial journalism, NOT a betting recommendation.',
    '- Responsible language: NEVER use "sure win", "guaranteed", "can\'t lose", "lock", "certainty" or any promise of profit.',
    '- End each section with this disclosure as plain text (no bold, no italic, no markdown formatting), matching that section\'s own language exactly:',
    watchingDisclosureBlock(),
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
      type: 'analysis',
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
      type: 'analysis' as const,
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

// ── Presence (watch-lite) minimal posts ─────────────────────────────────────

const PRESENCE_FALLBACK = 'On our watch list for audience coverage.';

const PRESENCE_FALLBACK_I18N: Record<PostLang, string> = {
  en: PRESENCE_FALLBACK,
  vi: 'Tr\u1eadn \u0111\u1ea5u n\u1eb1m trong danh s\u00e1ch theo d\u00f5i c\u1ee7a ch\u00fang t\u00f4i.',
  th: '\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e19\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e02\u0e2d\u0e07\u0e40\u0e23\u0e32',
  es: 'Este partido est\u00e1 en nuestra lista de seguimiento.',
};

/** Build minimal presence-only posts — no AI, just the note verbatim (Req 1). */
export function buildPresencePosts(w: WatchingRow): NewPost[] {
  const slug = buildNewsSlug(w.home_team, w.away_team, w.kickoff_utc);
  const matchup = `${w.home_team} vs ${w.away_team}`;
  const now = new Date().toISOString();

  const noteText = w.note?.trim() || null;
  const noteTrans = w.note_translations ?? {};

  return (['en', 'vi', 'th', 'es'] as PostLang[]).map((lang) => {
    const body = lang === 'en'
      ? (noteText || PRESENCE_FALLBACK)
      : (noteTrans[lang] || noteText || PRESENCE_FALLBACK_I18N[lang]);
    const footer = watchingDisclosureFor(lang);
    return {
      type: 'analysis' as const,
      slug,
      lang,
      title: `${NEWS_TITLES[lang]}: ${matchup}`,
      body_md: `${body}\n\n${footer}`,
      pick_ids: [],
      author: w.author,
      status: 'published' as const,
      published_at: now,
      meta_title: `${NEWS_TITLES[lang]}: ${matchup}`,
      meta_description: body.slice(0, 155),
      target_keyword: null,
      skipLint: true, // Presence cards are intentionally minimal — bypass thin-content gate
    };
  });
}

// ── Publish ─────────────────────────────────────────────────────────────────

export interface WatchingCardDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  siteUrl: string;
  /** WATCHING FB post — same fail-safe rule as the TG card; skipped when unset. */
  facebook?: { pageId: string; pageToken: string };
}

export interface WatchingNewsDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
  revalidateUrl?: string;
  /** Post Restructure v1 §2.4: 3-line WATCHING card (TG only, replaces the article announce). */
  card?: WatchingCardDeps;
  /** Optional Supabase client for player_photos lookup. If omitted, no hero image is injected. */
  db?: SupabaseClient;
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
  const msg = formatWatchingMessage(w, deps.siteUrl, slug, reason);
  const imageUrl = `${deps.siteUrl}/images/wildlyplay_watching.png`;

  // TG channel card — independent fail-safe.
  if (deps.channelChatId) {
    try {
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

  // FB post — same restore Nick asked for; never blocks the TG card (own try/catch).
  if (deps.facebook) {
    try {
      try {
        await postPhotoToFacebook(deps.facebook, imageUrl, msg);
      } catch (err) {
        log.warn(`watching FB photo failed for ${w.home_team} vs ${w.away_team} — falling back to link post:`, err);
        await postToFacebook(deps.facebook, msg, buildArticleLink(deps.siteUrl, slug, 'facebook'));
      }
      log.info(`watching FB post sent for ${w.home_team} vs ${w.away_team}`);
    } catch (err) {
      log.warn(`watching FB post failed for ${w.home_team} vs ${w.away_team} — TG card already sent:`, err);
    }
  }
}

/** Generate + publish a news article for a /watching entry. Fire-and-forget: never throws.
 *  `reason` = hand-written one-sentence card hook (R5) — card-only, not persisted.
 *  Presence-only (watch-lite) cards skip AI generation and render minimal note-only posts. */
export async function publishWatchingNews(
  deps: WatchingNewsDeps,
  watching: WatchingRow,
  reason?: string | null,
): Promise<void> {
  try {
    // Presence cards don't need an API key (no AI generation) — but deep-gate cards do.
    if (!watching.presence && !deps.env.apiKey) return;

    if (isPlaceholderTeam(watching.home_team) || isPlaceholderTeam(watching.away_team)) {
      log.info(`watching-news: skipping placeholder team (${watching.home_team} vs ${watching.away_team})`);
      return;
    }

    const slug = buildNewsSlug(watching.home_team, watching.away_team, watching.kickoff_utc);
    const existingSlugs = await deps.store.listPostSlugsByType('analysis');
    if (existingSlugs.has(slug)) {
      log.info(`watching-news: slug "${slug}" already exists — skipping`);
      return;
    }

    // Req 1: presence cards get minimal posts (note only), no AI generation.
    const posts = watching.presence
      ? buildPresencePosts(watching)
      : await (async () => {
          const text = await callClaude(
            { apiKey: deps.env.apiKey!, model: deps.env.model ?? DEFAULT_MODEL },
            buildWatchingNewsPrompt(watching),
            `watching-news ${watching.home_team} vs ${watching.away_team}`,
            MAX_TOKENS,
          );
          if (!text) return null;
          return buildNewsPosts(watching, text);
        })();

    if (!posts) return;

    // Player photo hero: prepend CC-licensed image to EN body when player_photos table has a match.
    // Skip for presence cards — minimal render, no hero image needed.
    if (deps.db && !watching.presence) {
      try {
        const { data: photos } = await deps.db
          .from('player_photos')
          .select('player_name, image_url, credit')
          .or(`team.ilike.%${watching.home_team}%,team.ilike.%${watching.away_team}%`)
          .limit(1);
        if (photos?.length) {
          const p = photos[0] as { player_name: string; image_url: string; credit: string };
          const storageBase = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
          const heroMd = `![${p.player_name}](${storageBase}/${p.image_url})\n*${p.credit}*\n\n`;
          for (const post of posts) {
            post.body_md = heroMd + post.body_md;
          }
        }
      } catch (err) {
        log.warn(`watching-news: player photo lookup failed — skipping:`, err);
      }
    }

    // Validation guard: check all 4 langs have body before publishing
    const langBodies: Partial<Record<import('./store').PostLang, string>> = {};
    for (const p of posts) langBodies[p.lang as import('./store').PostLang] = p.body_md;
    const { ok, missing } = validate4Lang(langBodies);
    if (!ok) log.warn(`watching-news: incomplete langs [${missing.join(',')}] for ${watching.home_team} vs ${watching.away_team} — publishing available langs`);
    // Per-lang resilience: one lang failing seo-lint must NOT drop the card (bug: France-Morocco
    // 09/07 — a Thai katakana glitch blocked insert, killing the whole announce). Publish what
    // passes; send the card as long as >=1 lang is live.
    let published = 0;
    const failedLangs: string[] = [];
    for (const post of posts) {
      try {
        await deps.store.insertPost(post);
        published++;
      } catch (err) {
        failedLangs.push(post.lang);
        log.warn(`watching-news: insertPost failed for ${post.slug}/${post.lang} — skipping this lang:`, err);
      }
    }
    if (published === 0) {
      log.warn(`watching-news: no langs published for ${watching.home_team} vs ${watching.away_team} — skipping card`);
      return;
    }
    if (failedLangs.length) log.warn(`watching-news: published ${published}/${posts.length} for ${watching.home_team} vs ${watching.away_team}, failed langs [${failedLangs.join(',')}]`);
    else log.info(`watching-news: ✅ published ${published}${watching.presence ? ' PRESENCE (minimal)' : ''} posts for ${watching.home_team} vs ${watching.away_team} → /analysis/${slug}`);
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
