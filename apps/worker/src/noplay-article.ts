/**
 * No-play article: when the Curator passes on a match via /noplay,
 * auto-generate a discipline-framed article (4 languages) and distribute.
 * A failure must NEVER break the /noplay reply — every path logs and returns.
 */
import type { Api } from 'grammy';
import { callClaude, POST_FLAGS, slugify, splitLangSections, DEFAULT_MODEL } from './recap';
import { parseAnalysisSection } from './news';
import { buildArticleLink } from './announce-article';
import type { NewPost, PostLang, Store } from './store';
import { createRevalidator } from './revalidate';
import { log } from './log';
import type { ParsedNoPlay, NoPlayReason } from './parse-noplay';

const MAX_TOKENS = 6000;

// ── Reason labels ──────────────────────────────────────────────────────────

const REASON_LABELS: Record<NoPlayReason, string> = {
  NO_EDGE: 'Nothing worth backing at this price',
  PRICE_TOO_SHORT: 'Price too short for the risk',
  VARIANCE_TOO_HIGH: 'Variance too high to justify a stake',
  TEAM_NEWS_UNCLEAR: 'Key team news still unclear',
  MARKET_EFFICIENT: 'Market already priced efficiently',
  SIGNAL_UNSTABLE: 'Signal too unstable to act on',
  VALUE_GONE: 'Price moved past our number',
};

// ── Slug ────────────────────────────────────────────────────────────────────

export function buildNoPlaySlug(home: string, away: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `no-play-${slugify(home)}-vs-${slugify(away)}-${date}`;
}

// ── Prompt ──────────────────────────────────────────────────────────────────

export function buildNoPlayPrompt(np: ParsedNoPlay): string {
  const watchingLine = np.watching ? `\n- What could change: ${np.watching}` : '';
  const noteLine = np.note ? `\n- Curator note: ${np.note}` : '';
  const watchingRule = np.watching ? '\n- Include a section about what could change the decision.' : '';

  return `<role>
You are a senior football editorial writer for the WildlyPlay newsroom (wildlyplay.com/news). You write discipline-framed no-play articles — explaining why the Curator deliberately passes on a match.
</role>

<context>
Match: ${np.homeTeam} vs ${np.awayTeam}
League: ${np.league}
Reason for passing: ${REASON_LABELS[np.reason]} (${np.reason})${watchingLine}${noteLine}
</context>

<rules>
- Work ONLY from the data above plus general football knowledge — do NOT invent injuries, lineups, stats, quotes, or specific match events.
- Explain why the Curator is passing — frame the specific reason clearly.${watchingRule}
- End each section with the discipline framing: "We pass when there's nothing worth backing — that's the discipline."
- Then disclosure as plain text (no bold, no italic): AI-written — WildlyPlay Newsroom
- Responsible language: NEVER use "sure win", "guaranteed", "lock" or any promise of profit.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie". Use "nothing worth backing" or "no reason to play" instead.
- Do NOT copy any external source verbatim.
- Lead with tension, a specific insight, or a surprising angle — never a template opener.
</rules>

<bad_examples>
BAD: "Spain face Saudi Arabia in World Cup Group H. The Curator has decided to pass on this one."
WHY: Template opener ("X face Y in Group Z"), generic second sentence with no insight into the reasoning.
</bad_examples>

<good_examples>
GOOD: "Full-strength, heavily favoured — and the Curator still passes. When a price tells you nothing the market doesn't already know, discipline means sitting out."
WHY: Leads with tension (passing despite strength), immediately frames the reasoning.
</good_examples>

<output>
Write exactly FOUR language sections in this order:
English under ${POST_FLAGS.en}, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.

Each section MUST start with these 3 lines (EXACTLY this format, each on its own line):
[META_TITLE] <SEO title under 60 chars with primary keyword>
[META_DESC] <meta description 150-160 chars>
[KEYWORD] <primary target keyword>
Then a blank line, then the article body (300-500 words, markdown, no H1).
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) each language section is in the correct language, (4) no template opener like "X face Y in Group Z", (5) discipline framing and disclosure present in every section.
</self_critique>`;
}

// ── Build Posts ─────────────────────────────────────────────────────────────

const NOPLAY_TITLES: Record<PostLang, string> = {
  en: 'No Play', vi: 'Bỏ qua', th: 'ไม่เล่น', es: 'Sin apuesta',
};

export function buildNoPlayPosts(np: ParsedNoPlay, text: string): NewPost[] {
  const slug = buildNoPlaySlug(np.homeTeam, np.awayTeam);
  const matchup = `${np.homeTeam} vs ${np.awayTeam}`;
  const now = new Date().toISOString();

  // Split by language flags, then parse meta from each section
  const langSections = splitLangSections(text);
  if (!langSections) {
    return [{
      type: 'no-play',
      slug,
      lang: 'en',
      title: `${NOPLAY_TITLES.en}: ${matchup}`,
      body_md: text.trim(),
      pick_ids: [],
      status: 'published',
      published_at: now,
      meta_title: null,
      meta_description: null,
      target_keyword: null,
    }];
  }

  return (Object.entries(langSections) as [PostLang, string][])
    .map(([lang, rawBody]) => {
      const section = parseAnalysisSection(rawBody);
      const title = section?.meta_title ?? `${NOPLAY_TITLES[lang]}: ${matchup}`;
      // Strip [META_TITLE]/[META_DESC]/[KEYWORD] lines from body if parser failed
      const cleanBody = (section?.body ?? rawBody)
        .replace(/^\[META_TITLE\].*$/gm, '')
        .replace(/^\[META_DESC\].*$/gm, '')
        .replace(/^\[KEYWORD\].*$/gm, '')
        .trim();
      return {
        type: 'no-play' as const,
        slug,
        lang,
        title,
        body_md: cleanBody,
        pick_ids: [],
        status: 'published' as const,
        published_at: now,
        meta_title: section?.meta_title ?? title,
        meta_description: section?.meta_description ?? null,
        target_keyword: section?.target_keyword ?? null,
      };
    });
}

// ── Publish ────────────────────────────────────────────────────────────────

export interface NoPlayCardDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  siteUrl: string;
}

export interface NoPlayArticleDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
  revalidateUrl?: string;
  /** Post Restructure v1 §2.2: 3-line NO-PLAY card, verdict first (TG only — FB gets no-play singles only inside the weekly recap). */
  card?: NoPlayCardDeps;
}

/** 3-line ⛔ NO-PLAY card (Post Restructure Spec v1 §2.2, Nick DUYỆT 3/7). Verdict = hand-written note, reason label as fallback — never auto-truncated article text (R5). */
export function formatNoPlayMessage(np: ParsedNoPlay, siteUrl: string, slug: string): string {
  const verdict = np.note ?? REASON_LABELS[np.reason];
  return [
    `\u26D4 NO-PLAY \u2014 ${np.homeTeam} vs ${np.awayTeam} \u00b7 ${np.league}`,
    `${verdict} \u2014 why the Curator passes:`,
    `\u{1F517} ${buildArticleLink(siteUrl, slug, 'telegram')}`,
  ].join('\n');
}

/** Send the NO-PLAY card to the TG channel. Fire-and-forget — never throws. */
async function sendNoPlayCard(deps: NoPlayCardDeps, np: ParsedNoPlay, slug: string): Promise<void> {
  if (!deps.channelChatId) return;
  try {
    const msg = formatNoPlayMessage(np, deps.siteUrl, slug);
    const imageUrl = `${deps.siteUrl}/images/wildlyplay_noplay.png`;
    try {
      await deps.api.sendPhoto(deps.channelChatId, imageUrl, { caption: msg });
    } catch {
      await deps.api.sendMessage(deps.channelChatId, msg);
    }
    log.info(`no-play card sent for ${np.homeTeam} vs ${np.awayTeam}`);
  } catch (err) {
    log.warn(`no-play card failed for ${np.homeTeam} vs ${np.awayTeam} — article already published:`, err);
  }
}

/** Generate + publish a no-play article. Fire-and-forget: never throws. */
export async function publishNoPlayArticle(
  deps: NoPlayArticleDeps,
  noplay: ParsedNoPlay,
): Promise<void> {
  try {
    if (!deps.env.apiKey) return;

    const slug = buildNoPlaySlug(noplay.homeTeam, noplay.awayTeam);
    const existingSlugs = await deps.store.listPostSlugsByType('no-play');
    if (existingSlugs.has(slug)) {
      log.info(`noplay-article: slug "${slug}" already exists — skipping`);
      return;
    }

    const text = await callClaude(
      { apiKey: deps.env.apiKey, model: deps.env.model ?? DEFAULT_MODEL },
      buildNoPlayPrompt(noplay),
      `noplay-article ${noplay.homeTeam} vs ${noplay.awayTeam}`,
      MAX_TOKENS,
    );
    if (!text) return;

    const posts = buildNoPlayPosts(noplay, text);
    for (const post of posts) {
      await deps.store.insertPost(post);
    }
    log.info(`noplay-article: published ${posts.length} posts for ${noplay.homeTeam} vs ${noplay.awayTeam}`);
    if (deps.card) await sendNoPlayCard(deps.card, noplay, slug);

    if (deps.revalidateUrl) {
      const revalidate = createRevalidator({
        siteUrl: deps.revalidateUrl,
        secret: process.env.REVALIDATE_SECRET,
      });
      await revalidate(['posts']);
    }
  } catch (err) {
    log.warn(`noplay-article: publish failed for ${noplay.homeTeam} vs ${noplay.awayTeam}:`, err);
  }
}
