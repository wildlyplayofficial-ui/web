/**
 * P2: ESPN-level preview enrichment — Guardian API + Google News RSS + H2H + player photos.
 * Grounded LLM (Sonnet): every fact cited, doubt reported as-is, no hallucination.
 * Spec: /tmp/spec-news-p2.md (Nick approved 14/7).
 * Fail-safe: any failure → fall back to P1 deterministic template (renderPreview).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, slugify } from './recap';
import { log } from './log';
import { NEWS_LANGS, type NewsLang, type Rendered } from './news-gen-templates';

// ── Config ──────────────────────────────────────────────────────────────────

/** Competitions eligible for P2 enrichment. Start small — expand after Nick reviews. */
export const P2_COMPETITIONS = ['wc-2026'] as const;
export const P2_COMPETITION_SET = new Set<string>(P2_COMPETITIONS);

const SONNET_MODEL = 'claude-sonnet-4-6';
const GUARDIAN_BASE = 'https://content.guardianapis.com/search';
const GNEWS_RSS_BASE = 'https://news.google.com/rss/search';
const P2_SOURCE = 'Guardian API + Google News';
const P2_BYLINE = 'WildlyPlay News';
const P2_MAX_TOKENS = 6000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface P2EnrichInput {
  home: string;
  away: string;
  competition: string;
  dateUtc: string;
  formHome: string | null;
  formAway: string | null;
  pickUrl: string | null;
  pickAuthor: string | null;
  siteUrl: string;
}

interface GuardianArticle {
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  fields?: { bodyText?: string };
}

interface H2HMatch {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  date: string;
  competition: string;
}

interface PlayerPhoto {
  player_name: string;
  team_name: string;
  photo_url: string;
  credit: string;
  license: string;
}

// ── Guardian API ────────────────────────────────────────────────────────────

async function fetchGuardianArticles(
  apiKey: string,
  home: string,
  away: string,
): Promise<GuardianArticle[]> {
  const query = `${home} ${away} football`;
  const url = `${GUARDIAN_BASE}?q=${encodeURIComponent(query)}&section=football&order-by=newest&page-size=5&show-fields=bodyText&api-key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    log.warn(`news-p2: Guardian API ${res.status}`);
    return [];
  }
  const data = await res.json() as { response?: { results?: GuardianArticle[] } };
  return data.response?.results ?? [];
}

// ── Google News RSS ─────────────────────────────────────────────────────────

async function fetchGoogleNewsSnippets(team: string): Promise<string[]> {
  const query = `${team} football when:2d`;
  const url = `${GNEWS_RSS_BASE}?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const xml = await res.text();
    // Extract titles from RSS XML — lightweight, no parser dependency
    const titles: string[] = [];
    const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml)) !== null) {
      const title = (match[1] ?? match[2] ?? '').trim();
      if (title && title !== 'Google News' && titles.length < 8) {
        titles.push(title);
      }
    }
    return titles;
  } catch {
    return [];
  }
}

// ── H2H from match_live_state ───────────────────────────────────────────────

async function fetchH2H(
  sb: SupabaseClient,
  home: string,
  away: string,
): Promise<H2HMatch[]> {
  const normalize = (n: string) =>
    n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const hNorm = normalize(home);
  const aNorm = normalize(away);

  // Fetch finished matches from last 4 years involving both teams
  const since = new Date(Date.now() - 4 * 365 * 86_400_000).toISOString();
  const { data } = await sb.from('match_live_state')
    .select('home_team, away_team, home_score, away_score, kickoff_utc, competition')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .gte('kickoff_utc', since)
    .order('kickoff_utc', { ascending: false })
    .limit(200);

  if (!data) return [];

  type Row = { home_team: string; away_team: string; home_score: number; away_score: number; kickoff_utc: string; competition: string };
  return (data as Row[])
    .filter((m) => {
      const mh = normalize(m.home_team);
      const ma = normalize(m.away_team);
      return (mh === hNorm && ma === aNorm) || (mh === aNorm && ma === hNorm);
    })
    .slice(0, 10)
    .map((m) => ({
      home: m.home_team,
      away: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      date: m.kickoff_utc.slice(0, 10),
      competition: m.competition || 'football',
    }));
}

// ── Player photos from Supabase ─────────────────────────────────────────────

async function fetchPlayerPhotos(
  sb: SupabaseClient,
  home: string,
  away: string,
): Promise<PlayerPhoto[]> {
  const { data } = await sb.from('player_photos')
    .select('player_name, team, image_url, credit, license')
    .or(`team.ilike.%${home}%,team.ilike.%${away}%`)
    .limit(10);
  return ((data ?? []) as { player_name: string; team: string; image_url: string; credit: string; license: string }[])
    .map((r) => ({ player_name: r.player_name, team_name: r.team, photo_url: r.image_url, credit: r.credit, license: r.license }));
}

// ── LLM Prompt ──────────────────────────────────────────────────────────────

function buildP2Prompt(
  input: P2EnrichInput,
  guardianArticles: GuardianArticle[],
  newsSnippets: string[],
  h2h: H2HMatch[],
  playerPhotos: PlayerPhoto[],
): string {
  // Build grounding context from sources
  const guardianCtx = guardianArticles.length > 0
    ? guardianArticles.map((a) => {
        const body = (a.fields?.bodyText ?? '').slice(0, 2000);
        return `[Guardian: ${a.webTitle}] (${a.webUrl}, ${a.webPublicationDate})\n${body}`;
      }).join('\n\n---\n\n')
    : '(No Guardian articles found)';

  const newsCtx = newsSnippets.length > 0
    ? newsSnippets.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(No recent Google News headlines)';

  const h2hCtx = h2h.length > 0
    ? h2h.map((m) => `${m.date}: ${m.home} ${m.homeScore}-${m.awayScore} ${m.away} (${m.competition})`).join('\n')
    : '(No head-to-head data available)';

  const photoCtx = playerPhotos.length > 0
    ? playerPhotos.map((p) => `- ${p.player_name} (${p.team_name}): ${p.photo_url} | Credit: ${p.credit} | License: ${p.license}`).join('\n')
    : '(No player photos available)';

  const formCtx = [
    input.formHome ? `${input.home} recent form: ${input.formHome}` : null,
    input.formAway ? `${input.away} recent form: ${input.formAway}` : null,
  ].filter(Boolean).join('\n') || '(Form data unavailable)';

  return `You write neutral, informative pre-match preview articles for the WildlyPlay newsroom (wildlyplay.com/news).

Match:
- ${input.home} vs ${input.away}
- Competition: ${input.competition}
- Date: ${input.dateUtc}

Sources available (use these + your general football knowledge):

=== NEWS ARTICLES ===
${guardianCtx}

=== RECENT HEADLINES ===
${newsCtx}

=== HEAD-TO-HEAD RECORD (from our database — use exact numbers) ===
${h2hCtx}

=== TEAM FORM ===
${formCtx}

${photoCtx !== '(No player photos available)' ? `=== PLAYER PHOTOS ===\n${photoCtx}` : ''}

Write a pre-match preview with exactly FOUR language sections, in this order:
English under # English, Vietnamese under # Vietnamese, Thai under # Thai, Spanish under # Spanish.

Each section: 250-400 words, markdown (## for subsections, no H1).

ATOMIC ANSWER: The very first sentence MUST be a self-contained factual statement — e.g. "${input.home} face ${input.away} in ${input.competition} on ${input.dateUtc}, with both teams looking to build momentum."

Cover: team form, key players to watch, tactical outlook, and what to watch for.

Rules:
- Use the sources above PLUS your general football knowledge about these teams. Do NOT invent specific injuries, quotes, or match events you cannot verify.
- If a source reports a player as "doubtful" — write exactly that. Never upgrade to "will miss" or "will start".
- H2H data above is verified — use those exact numbers.
- Neutral, informative tone — editorial journalism, NOT a betting recommendation.
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose".
- End each language section with:
---
WildlyPlay News | AI-assisted coverage | ${input.dateUtc}`;
}

// ── P2 Enrichment pipeline ──────────────────────────────────────────────────

export interface P2Deps {
  sb: SupabaseClient;
  siteUrl: string;
  anthropicApiKey: string;
  guardianApiKey: string;
}

/** Generate P2 enriched preview for a single match.
 *  Returns { headline, body } per language, or null on failure (caller falls back to P1). */
export async function enrichPreviewP2(
  deps: P2Deps,
  input: P2EnrichInput,
): Promise<Map<NewsLang, Rendered> | null> {
  const { sb, anthropicApiKey, guardianApiKey } = deps;

  // Fetch all sources in parallel — any individual failure = empty, not abort
  const [guardianArticles, homeNews, awayNews, h2h, photos] = await Promise.all([
    fetchGuardianArticles(guardianApiKey, input.home, input.away).catch(() => [] as GuardianArticle[]),
    fetchGoogleNewsSnippets(input.home).catch(() => [] as string[]),
    fetchGoogleNewsSnippets(input.away).catch(() => [] as string[]),
    fetchH2H(sb, input.home, input.away).catch(() => [] as H2HMatch[]),
    fetchPlayerPhotos(sb, input.home, input.away).catch(() => [] as PlayerPhoto[]),
  ]);

  // Guardian fail-safe: if 0 Guardian articles, fall back to P1
  if (guardianArticles.length === 0) {
    log.warn(`news-p2: 0 Guardian articles for ${input.home} vs ${input.away} — falling back to P1`);
    return null;
  }

  const newsSnippets = [...homeNews, ...awayNews];
  const prompt = buildP2Prompt(input, guardianArticles, newsSnippets, h2h, photos);

  const rawText = await callClaude(
    { apiKey: anthropicApiKey, model: SONNET_MODEL },
    prompt,
    `news-p2 ${slugify(input.home)}-vs-${slugify(input.away)}`,
    P2_MAX_TOKENS,
  );

  if (!rawText) {
    log.warn(`news-p2: LLM returned null for ${input.home} vs ${input.away} — falling back to P1`);
    return null;
  }

  // Parse the 4-language output
  const result = parseP2Output(rawText, input, photos);
  if (!result) {
    log.warn(`news-p2: failed to parse LLM output for ${input.home} vs ${input.away} — falling back to P1`);
    return null;
  }

  return result;
}

// ── Output parser ───────────────────────────────────────────────────────────

const LANG_HEADERS: Record<NewsLang, RegExp> = {
  en: /^#+\s*(?:EN\b|English|🇬🇧|🇺🇸|\*\*EN\*\*|\*\*English\*\*)/im,
  vi: /^#+\s*(?:VI\b|Vietnamese|Tiếng Việt|🇻🇳|\*\*VI\*\*|\*\*Vietnamese\*\*)/im,
  th: /^#+\s*(?:TH\b|Thai|ไทย|🇹🇭|\*\*TH\*\*|\*\*Thai\*\*)/im,
  es: /^#+\s*(?:ES\b|Spanish|Español|🇪🇸|\*\*ES\*\*|\*\*Spanish\*\*)/im,
};

function parseP2Output(
  text: string,
  input: P2EnrichInput,
  photos: PlayerPhoto[],
): Map<NewsLang, Rendered> | null {
  const result = new Map<NewsLang, Rendered>();
  const positions: { lang: NewsLang; idx: number }[] = [];

  for (const lang of NEWS_LANGS) {
    const match = LANG_HEADERS[lang].exec(text);
    if (match) positions.push({ lang, idx: match.index });
  }

  positions.sort((a, b) => a.idx - b.idx);

  if (positions.length === 0) {
    log.warn(`news-p2: no lang headers found. First 200 chars: ${text.slice(0, 200)}`);
  }

  // Must have at least EN
  if (!positions.some((p) => p.lang === 'en')) return null;

  for (let i = 0; i < positions.length; i++) {
    const { lang, idx } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    let body = text.slice(idx, end).trim();

    // Remove the language header line itself
    body = body.replace(LANG_HEADERS[lang], '').trim();

    // Inject player photo credit lines
    // Always add credit for hero photo (definitely used), match in-body by last name
    const heroPhoto = photos.length > 0 ? photos[0] : null;
    if (heroPhoto && !body.includes(heroPhoto.credit)) {
      body += `\n\n*Photo: ${heroPhoto.player_name} — ${heroPhoto.credit} (${heroPhoto.license})*`;
    }
    // Add credits for other referenced players (match by last name to handle LLM shortening)
    for (const photo of photos.slice(1)) {
      const lastName = photo.player_name.split(' ').pop() ?? photo.player_name;
      if (body.includes(lastName) && !body.includes(photo.credit)) {
        body += `\n*Photo: ${photo.player_name} — ${photo.credit} (${photo.license})*`;
      }
    }

    // Append disclosure if not already present
    const disclosureMark = 'AI-assisted';
    if (!body.includes(disclosureMark)) {
      body += `\n\n---\nWildlyPlay News | AI-assisted summary from Guardian, Google News | ${input.dateUtc}`;
    }

    // Add pick reference if available
    if (input.pickUrl && input.pickAuthor && !body.includes(input.pickUrl)) {
      const pickLine = lang === 'en' ? `${input.pickAuthor} has published a pick for this match: ${input.pickUrl}`
        : lang === 'vi' ? `${input.pickAuthor} đã đăng kèo cho trận này: ${input.pickUrl}`
        : lang === 'th' ? `${input.pickAuthor} ได้เผยแพร่ทีเด็ดสำหรับแมตช์นี้: ${input.pickUrl}`
        : `${input.pickAuthor} ha publicado un pick para este partido: ${input.pickUrl}`;
      body += `\n\n${pickLine}`;
    }

    const headline = buildP2Headline(lang, input);
    result.set(lang, { headline, body });
  }

  return result.size >= 1 ? result : null;
}

const P2_HEADLINES: Record<NewsLang, (home: string, away: string, comp: string) => string> = {
  en: (h, a, c) => `Preview: ${h} vs ${a} — ${c}`,
  vi: (h, a, c) => `Tr\u01B0\u1EDBc tr\u1EADn: ${h} vs ${a} — ${c}`,
  th: (h, a, c) => `\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27: ${h} \u0E1E\u0E1A ${a} — ${c}`,
  es: (h, a, c) => `Previa: ${h} vs ${a} — ${c}`,
};

function buildP2Headline(lang: NewsLang, input: P2EnrichInput): string {
  return P2_HEADLINES[lang](input.home, input.away, input.competition);
}

// ── P2 Result enrichment ────────────────────────────────────────────────────

export interface P2ResultInput {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  dateUtc: string;
  formHome: string | null;
  formAway: string | null;
  pickUrl: string | null;
  pickAuthor: string | null;
  siteUrl: string;
}

function buildP2ResultPrompt(
  input: P2ResultInput,
  guardianArticles: GuardianArticle[],
  newsSnippets: string[],
  h2h: H2HMatch[],
): string {
  const guardianCtx = guardianArticles.length > 0
    ? guardianArticles.map((a) => {
        const body = (a.fields?.bodyText ?? '').slice(0, 2000);
        return `[Guardian: ${a.webTitle}] (${a.webUrl}, ${a.webPublicationDate})\n${body}`;
      }).join('\n\n---\n\n')
    : '(No Guardian articles found)';

  const newsCtx = newsSnippets.length > 0
    ? newsSnippets.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(No recent Google News headlines)';

  const h2hCtx = h2h.length > 0
    ? h2h.map((m) => `${m.date}: ${m.home} ${m.homeScore}-${m.awayScore} ${m.away} (${m.competition})`).join('\n')
    : '(No head-to-head data available)';

  const formCtx = [
    input.formHome ? `${input.home} recent form: ${input.formHome}` : null,
    input.formAway ? `${input.away} recent form: ${input.formAway}` : null,
  ].filter(Boolean).join('\n') || '(Form data unavailable)';

  const winner = input.homeScore > input.awayScore ? input.home
    : input.awayScore > input.homeScore ? input.away : null;
  const scoreline = `${input.home} ${input.homeScore}-${input.awayScore} ${input.away}`;

  return `You write neutral, informative match reports for the WildlyPlay newsroom (wildlyplay.com/news).

Result: ${scoreline}
Competition: ${input.competition}
Date: ${input.dateUtc}
Winner: ${winner ?? 'Draw'}

Sources available:

=== NEWS ARTICLES ===
${guardianCtx}

=== RECENT HEADLINES ===
${newsCtx}

=== HEAD-TO-HEAD RECORD (from our database — use exact numbers) ===
${h2hCtx}

=== TEAM FORM ===
${formCtx}

Write a match report with exactly FOUR language sections, in this order:
English under # English, Vietnamese under # Vietnamese, Thai under # Thai, Spanish under # Spanish.

Each section: 200-350 words, markdown (## for subsections, no H1).

ATOMIC ANSWER: First sentence MUST be a self-contained fact — e.g. "${scoreline} — ${winner ?? 'both teams shared the points'} in ${input.competition} on ${input.dateUtc}."

Cover: match summary with key moments from sources, how this result affects standings/form, tactical observations from sources, and what's next for both teams.

Rules:
- Use the news sources above for specific match details (goals, incidents, quotes). For general context about the teams and competition, you may use your football knowledge.
- Do NOT invent specific goals, scorers, red cards, or match events unless confirmed in the sources above. The scoreline ${scoreline} is verified — use it. Anything else about the match must come from sources.
- If a source mentions a goalscorer or key incident, cite it: [Source: Guardian/headline].
- H2H data above is verified — use those exact numbers.
- Neutral, informative tone — editorial journalism, NOT a betting recommendation.
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose".
- End each language section with:
---
WildlyPlay News | AI-assisted match report | ${input.dateUtc}`;
}

/** Generate P2 enriched result for a single match. Null on failure → P1 fallback. */
export async function enrichResultP2(
  deps: P2Deps,
  input: P2ResultInput,
): Promise<Map<NewsLang, Rendered> | null> {
  const { sb, anthropicApiKey, guardianApiKey } = deps;

  const [guardianArticles, homeNews, awayNews, h2h] = await Promise.all([
    fetchGuardianArticles(guardianApiKey, input.home, input.away).catch(() => [] as GuardianArticle[]),
    fetchGoogleNewsSnippets(input.home).catch(() => [] as string[]),
    fetchGoogleNewsSnippets(input.away).catch(() => [] as string[]),
    fetchH2H(sb, input.home, input.away).catch(() => [] as H2HMatch[]),
  ]);

  // Unlike preview, result can proceed without Guardian (score is the main fact)
  const newsSnippets = [...homeNews, ...awayNews];
  const prompt = buildP2ResultPrompt(input, guardianArticles, newsSnippets, h2h);

  const rawText = await callClaude(
    { apiKey: anthropicApiKey, model: SONNET_MODEL },
    prompt,
    `news-p2-result ${slugify(input.home)}-vs-${slugify(input.away)}`,
    P2_MAX_TOKENS,
  );

  if (!rawText) {
    log.warn(`news-p2: result LLM returned null for ${input.home} vs ${input.away}`);
    return null;
  }

  const result = parseP2Output(rawText, input as unknown as P2EnrichInput, []);
  if (!result) {
    log.warn(`news-p2: failed to parse result output for ${input.home} vs ${input.away}`);
    return null;
  }

  // Fix headlines to say "Result" not "Preview"
  for (const [lang, rendered] of result) {
    const scoreline = `${input.home} ${input.homeScore}-${input.awayScore} ${input.away}`;
    const headlines: Record<NewsLang, string> = {
      en: `Result: ${scoreline}`,
      vi: `Kết quả: ${scoreline}`,
      th: `ผลบอล: ${scoreline}`,
      es: `Resultado: ${scoreline}`,
    };
    result.set(lang, { headline: headlines[lang], body: rendered.body });
  }

  return result;
}

// ── Row builder for P2 (matches news_items schema) ──────────────────────────

export function buildP2Row(
  slug: string,
  renderedLangs: Map<NewsLang, Rendered>,
  opts: {
    type?: string;
    competitionId: string | null;
    matchId: string | null;
    pickId: string | null;
    publish: boolean;
    photos: PlayerPhoto[];
  },
): Record<string, unknown> {
  const now = new Date().toISOString();

  // Pick the first available player photo as hero_image, with credit
  const heroPhoto = opts.photos.length > 0 ? opts.photos[0] : null;

  const row: Record<string, unknown> = {
    slug,
    type: opts.type ?? 'preview',
    source: P2_SOURCE,
    source_url: 'https://www.theguardian.com/football',
    byline: P2_BYLINE,
    competition_id: opts.competitionId,
    match_id: opts.matchId,
    pick_id: opts.pickId,
    status: opts.publish ? 'published' : 'draft',
    published_at: opts.publish ? now : null,
    updated_at: now,
    // Player photo as hero image (CC licensed, credit in body)
    // Schema uses hero_card_url (not hero_image_url) — must match web page.tsx
    ...(heroPhoto ? { hero_card_url: heroPhoto.photo_url } : {}),
  };

  for (const lang of NEWS_LANGS) {
    const r = renderedLangs.get(lang);
    if (r) {
      row[`headline_${lang}`] = r.headline;
      row[`body_${lang}`] = r.body;
    } else {
      row[`headline_${lang}`] = null;
      row[`body_${lang}`] = null;
    }
  }

  return row;
}

