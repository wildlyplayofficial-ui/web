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
const P2_MAX_TOKENS = 4000;

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
    .select('player_name, team_name, photo_url, credit, license')
    .or(`team_name.ilike.%${home}%,team_name.ilike.%${away}%`)
    .limit(10);
  return (data ?? []) as PlayerPhoto[];
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

  return `<role>
You are a senior football journalist writing an ESPN-level pre-match preview for WildlyPlay (wildlyplay.com/news). Grounded, factual, well-sourced — never speculative.
</role>

<context>
Match: ${input.home} vs ${input.away}
Competition: ${input.competition}
Date: ${input.dateUtc}
</context>

<grounding_sources>
=== GUARDIAN ARTICLES ===
${guardianCtx}

=== RECENT NEWS HEADLINES ===
${newsCtx}

=== HEAD-TO-HEAD RECORD (from database — verified) ===
${h2hCtx}

=== TEAM FORM ===
${formCtx}

=== PLAYER PHOTOS AVAILABLE ===
${photoCtx}
</grounding_sources>

<rules>
CRITICAL GROUNDING RULES — violation = article rejected:
1. ONLY write facts from the <grounding_sources> above. Do NOT add knowledge from your training data. If something is not in the sources, do NOT include it.
2. REPORT-DOUBT-AS-IS: If a source says a player is "doubtful", "a doubt", "uncertain" — write EXACTLY that doubt level (e.g. "according to [source], X is doubtful for the match"). NEVER upgrade doubt to a definitive "X will miss" or "X will start". NEVER downgrade "doubtful" to "fit". This is the single most important rule.
3. Every injury, transfer, or quote MUST include a citation: [Source: Guardian/Google News headline]. If you cannot cite a source for a claim, omit it entirely.
4. Do NOT use any Guardian article text verbatim — extract facts and rewrite in your own words with citation.
5. H2H data above is from our verified database. Use these exact numbers. Do NOT recall different H2H results from memory.
6. Responsible language: NEVER use "sure win", "guaranteed", "can't lose", or promise outcomes.
7. Do NOT invent lineups, formations, or tactical setups unless explicitly stated in the sources.
8. If player photos are listed above, reference the player name naturally in a "Key Players" section. The photo will be displayed by the system — just mention the player.
</rules>

<output_format>
Write FOUR language versions, each with these sections:
- **Match Info**: Teams, competition, date
- **The Story**: What makes this match significant (from sources only)
- **Form**: Recent form using the data provided
- **Head-to-Head**: Using the H2H data above (exact scores)
- **Key Players**: Notable players mentioned in sources (with photo credit if photo available — format: "Photo: [credit], [license]")
- **Team News**: Injuries/lineup news FROM SOURCES ONLY (cite each). If no injury news in sources, write "No confirmed team news at time of writing."
- **What to Watch**: Key tactical/narrative angle from the sources

Languages (in order):
1. English (EN header)
2. Vietnamese (VI header)
3. Thai (TH header)
4. Spanish (ES header)

Each language section: 200-350 words.
Use markdown (## for sections within each language, no H1).
End each language version with: "---\\nWildlyPlay News | AI-assisted summary from Guardian, Google News | ${input.dateUtc}"
</output_format>

<self_critique>
Before outputting, verify:
1. Every injury/transfer claim has a [Source: ...] citation
2. No "doubtful" upgraded to "will miss" or "will start"
3. H2H numbers match exactly what was provided
4. No facts from training data — only from grounding_sources
5. All 4 languages present and correct
6. Disclosure label at end of each section
</self_critique>`;
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
  en: /^#+\s*(?:EN|English)/im,
  vi: /^#+\s*(?:VI|Vietnamese)/im,
  th: /^#+\s*(?:TH|Thai)/im,
  es: /^#+\s*(?:ES|Spanish)/im,
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

  // Must have at least EN
  if (!positions.some((p) => p.lang === 'en')) return null;

  for (let i = 0; i < positions.length; i++) {
    const { lang, idx } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    let body = text.slice(idx, end).trim();

    // Remove the language header line itself
    body = body.replace(LANG_HEADERS[lang], '').trim();

    // Inject player photo credit lines if photos were used and referenced
    for (const photo of photos) {
      if (body.includes(photo.player_name)) {
        // Ensure credit line is present (may already be from LLM)
        if (!body.includes(photo.credit)) {
          body += `\n\n*Photo: ${photo.player_name} — ${photo.credit} (${photo.license})*`;
        }
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
        : lang === 'vi' ? `${input.pickAuthor} da dang keo cho tran nay: ${input.pickUrl}`
        : lang === 'th' ? `${input.pickAuthor} phuey phaer teedued: ${input.pickUrl}`
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

// ── Row builder for P2 (matches news_items schema) ──────────────────────────

export function buildP2Row(
  slug: string,
  renderedLangs: Map<NewsLang, Rendered>,
  opts: {
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
    type: 'preview',
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
    ...(heroPhoto ? { hero_image_url: heroPhoto.photo_url, hero_image_credit: `${heroPhoto.credit} (${heroPhoto.license})` } : {}),
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

