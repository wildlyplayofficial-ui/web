/**
 * P1: /news auto-gen pipeline — preview/result/standings from structured Supabase data.
 * Spec: /tmp/spec-news-worker-pipeline.md (FINAL 13/7 — D1=A templates, D2=A livescore table,
 * D3 caps 6/6/3 pick-first, D5 football-data deferred).
 * Deterministic templates only (news-gen-templates.ts) — no LLM, no speculation.
 * Idempotency: slug is the unique key; insert ON CONFLICT DO NOTHING → re-runs never dupe
 * and never downgrade published→draft.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from './recap';
import { log } from './log';
import { lsFetch } from './ls-fetch';
import {
  NEWS_LANGS, renderPreview, renderResult, renderStandings,
  type PreviewData, type ResultData, type StandingsData, type Rendered,
} from './news-gen-templates';
import { P2_COMPETITION_SET, enrichPreviewP2, buildP2Row, type P2Deps, type P2EnrichInput } from './news-gen-p2';

/** Values copied from apps/web/lib/news.ts NEWS_TYPES (by-convention contract — worker
 *  cannot import apps/web). Unit test asserts this stays a subset of the canonical list. */
export const GEN_NEWS_TYPES = ['preview', 'result', 'standings'] as const;
export type GenNewsType = (typeof GEN_NEWS_TYPES)[number];

/** D3 (Nick 13/7): per-type daily caps; overflow skipped for good, no backfill. */
export const DAILY_CAPS: Record<GenNewsType, number> = { preview: 6, result: 6, standings: 3 };

const SOURCE = 'LiveScore API';
const SOURCE_URL = 'https://livescore-api.com/';
const BYLINE = 'WildlyPlay News';
const LS_TABLE = 'https://livescore-api.com/api-client/leagues/table.json';

// ── Slugs ────────────────────────────────────────────────────────────────────

export function buildMatchNewsSlug(type: 'preview' | 'result', home: string, away: string, kickoffUtc: string): string {
  return `${type}-${slugify(home)}-vs-${slugify(away)}-${kickoffUtc.slice(0, 10)}`;
}

export function buildStandingsSlug(competitionId: string, dateUtc: string): string {
  return `standings-${slugify(competitionId)}-${dateUtc}`;
}

/** Guard: `news-` prefix is swallowed by the live redirect /news/news-:slug → /analysis/news-:slug. */
export function isSlugSafe(slug: string): boolean {
  return !slug.startsWith('news-') && /^[a-z0-9-]+$/.test(slug);
}

// ── Form (Jane #1: optional — <3 historical matches → omit) ──────────────────

export interface FinishedMatch {
  home_team: string; away_team: string;
  home_score: number | null; away_score: number | null;
  kickoff_utc: string;
}

function normTeam(n: string): string {
  return n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** "W-D-L-W-W" (most recent first, up to 5) or null when <3 matches of history. */
export function computeForm(team: string, finished: FinishedMatch[]): string | null {
  const tn = normTeam(team);
  const mine = finished
    .filter((m) => m.home_score != null && m.away_score != null
      && (normTeam(m.home_team) === tn || normTeam(m.away_team) === tn))
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc))
    .slice(0, 5);
  if (mine.length < 3) return null;
  return mine.map((m) => {
    const isHome = normTeam(m.home_team) === tn;
    const us = isHome ? m.home_score! : m.away_score!;
    const them = isHome ? m.away_score! : m.home_score!;
    return us > them ? 'W' : us < them ? 'L' : 'D';
  }).join('-');
}

// ── D3 priority: pick > watching > comp tier (competitions row order) ────────

export interface Candidate { hasPick: boolean; hasWatching: boolean; tier: number; kickoffUtc: string }

export function prioritize<T extends Candidate>(items: T[], cap: number): T[] {
  return [...items].sort((a, b) => {
    if (a.hasPick !== b.hasPick) return a.hasPick ? -1 : 1;
    if (a.hasWatching !== b.hasWatching) return a.hasWatching ? -1 : 1;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.kickoffUtc.localeCompare(b.kickoffUtc);
  }).slice(0, Math.max(0, cap));
}

// ── Shared DB helpers ────────────────────────────────────────────────────────

interface Comp { id: string; name: string; livescore_id: number; tier: number }

async function getActiveComps(sb: SupabaseClient): Promise<Comp[]> {
  const { data } = await sb.from('competitions')
    .select('id, name, livescore_id').eq('status', 'active').order('id');
  return ((data ?? []) as { id: string; name: string; livescore_id: number }[])
    .map((r, i) => ({ id: r.id, name: r.name, livescore_id: Number(r.livescore_id), tier: i }));
}

async function countTodayByType(sb: SupabaseClient, type: GenNewsType): Promise<number> {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const { count } = await sb.from('news_items')
    .select('id', { count: 'exact', head: true })
    .eq('type', type).gte('created_at', start.toISOString());
  return count ?? 0;
}

async function existingSlugs(sb: SupabaseClient, slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();
  const { data } = await sb.from('news_items').select('slug').in('slug', slugs);
  return new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
}

/** Nick firewall review 13/7: pick line must use dynamic author label, never hardcode "The Curator". */
const AUTHOR_LABELS: Record<string, string> = { curator: 'The Curator', scout: 'The Scout' };

async function pickWatchLookup(sb: SupabaseClient, fxIds: string[]) {
  if (fxIds.length === 0) return { pickBy: new Map<string, string>(), pickAuthorBy: new Map<string, string>(), watchSet: new Set<string>() };
  const [p, w] = await Promise.all([
    sb.from('picks').select('id, unified_fixture_id, author')
      .in('unified_fixture_id', fxIds).in('status', ['published', 'won', 'lost', 'push']),
    sb.from('watching').select('id, unified_fixture_id').in('unified_fixture_id', fxIds),
  ]);
  type Link = { id: string; unified_fixture_id: string; author?: string };
  const picks = (p.data ?? []) as Link[];
  return {
    pickBy: new Map(picks.map((r) => [r.unified_fixture_id, r.id])),
    pickAuthorBy: new Map(picks.map((r) => [r.unified_fixture_id, AUTHOR_LABELS[r.author ?? ''] ?? null])),
    watchSet: new Set(((w.data ?? []) as Link[]).map((r) => r.unified_fixture_id)),
  };
}

function buildRow(
  type: GenNewsType, slug: string, render: (lang: (typeof NEWS_LANGS)[number]) => Rendered,
  opts: { competitionId: string | null; matchId: string | null; pickId: string | null; publish: boolean },
): Record<string, unknown> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    slug, type, source: SOURCE, source_url: SOURCE_URL, byline: BYLINE,
    competition_id: opts.competitionId, match_id: opts.matchId, pick_id: opts.pickId,
    status: opts.publish ? 'published' : 'draft',
    published_at: opts.publish ? now : null, // Jane #3: null while draft
    updated_at: now, // review-standards: worker sets updated_at manually
  };
  for (const lang of NEWS_LANGS) {
    try {
      const r = render(lang);
      row[`headline_${lang}`] = r.headline; row[`body_${lang}`] = r.body;
    } catch (err) {
      if (lang === 'en') throw err; // EN required — abort this item
      log.warn(`news-gen: ${lang} render failed for ${slug}:`, err);
      row[`headline_${lang}`] = null; row[`body_${lang}`] = null;
    }
  }
  return row;
}

export interface NewsGenDeps {
  sb: SupabaseClient;
  siteUrl: string;
  autopublish: boolean;
  revalidate: (tags: string[]) => Promise<void>;
  pingIndexNow: (urls: string[]) => Promise<void>;
  /** P2 deps — null when Guardian/Anthropic keys unavailable → all previews stay P1. */
  p2: P2Deps | null;
}

async function insertRows(deps: NewsGenDeps, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await deps.sb.from('news_items')
    .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
  if (error) { log.warn('news-gen: insert failed:', error.message); return 0; }
  if (deps.autopublish) {
    void deps.revalidate(['news']);
    void deps.pingIndexNow(rows.map((r) => `/news/${r.slug}`));
  }
  return rows.length;
}

// ── Preview scanner (T-24h window) ───────────────────────────────────────────

interface FixtureRow {
  id: string; competition_id: string; home_team_name: string; away_team_name: string;
  kickoff_utc: string; livescore_match_id: string | null;
}

export async function scanPreviews(deps: NewsGenDeps): Promise<number> {
  const { sb } = deps;
  const now = Date.now();
  const { data } = await sb.from('fixtures')
    .select('id, competition_id, home_team_name, away_team_name, kickoff_utc, livescore_match_id')
    .gte('kickoff_utc', new Date(now).toISOString())
    .lte('kickoff_utc', new Date(now + 24 * 3_600_000).toISOString());
  const fixtures = (data ?? []) as FixtureRow[];
  if (fixtures.length === 0) return 0;

  const cands = fixtures
    .map((f) => ({ f, slug: buildMatchNewsSlug('preview', f.home_team_name, f.away_team_name, f.kickoff_utc) }))
    .filter((c) => c.f.kickoff_utc && isSlugSafe(c.slug));
  const existing = await existingSlugs(sb, cands.map((c) => c.slug));
  const fresh = cands.filter((c) => !existing.has(c.slug));
  if (fresh.length === 0) return 0;

  const budget = DAILY_CAPS.preview - await countTodayByType(sb, 'preview');
  if (budget <= 0) return 0;

  const comps = await getActiveComps(sb);
  const tierOf = new Map(comps.map((c) => [c.id, c.tier]));
  const nameOf = new Map(comps.map((c) => [c.id, c.name]));
  const { pickBy, pickAuthorBy, watchSet } = await pickWatchLookup(sb, fresh.map((c) => c.f.id));

  const chosen = prioritize(fresh.map((c) => ({
    ...c,
    hasPick: pickBy.has(c.f.id), hasWatching: watchSet.has(c.f.id),
    tier: tierOf.get(c.f.competition_id) ?? 99, kickoffUtc: c.f.kickoff_utc,
  })), budget);

  const { data: fin } = await sb.from('match_live_state')
    .select('home_team, away_team, home_score, away_score, kickoff_utc')
    .eq('status', 'finished')
    .gte('kickoff_utc', new Date(now - 60 * 86_400_000).toISOString());
  const hist = (fin ?? []) as FinishedMatch[];

  // Split into P1 (template) and P2 (enriched) candidates
  const p1Chosen: typeof chosen = [];
  const p2Chosen: typeof chosen = [];
  for (const c of chosen) {
    if (deps.p2 && P2_COMPETITION_SET.has(c.f.competition_id)) {
      p2Chosen.push(c);
    } else {
      p1Chosen.push(c);
    }
  }

  // P1 rows (deterministic templates — unchanged)
  const p1Rows = p1Chosen.map((c) => {
    const pickId = pickBy.get(c.f.id) ?? null;
    const d: PreviewData = {
      home: c.f.home_team_name, away: c.f.away_team_name,
      competition: nameOf.get(c.f.competition_id) ?? c.f.competition_id,
      dateUtc: c.f.kickoff_utc.slice(0, 10),
      formHome: computeForm(c.f.home_team_name, hist),
      formAway: computeForm(c.f.away_team_name, hist),
      pickUrl: pickId ? `${deps.siteUrl}/play/${pickId}` : null,
      pickAuthor: pickAuthorBy.get(c.f.id) ?? null,
    };
    return buildRow('preview', c.slug, (lang) => renderPreview(lang, d), {
      competitionId: c.f.competition_id, matchId: c.f.livescore_match_id, pickId, publish: deps.autopublish,
    });
  });

  // P2 rows (Guardian + LLM enriched, fallback to P1 on failure)
  const p2Rows: Record<string, unknown>[] = [];
  for (const c of p2Chosen) {
    const pickId = pickBy.get(c.f.id) ?? null;
    const compName = nameOf.get(c.f.competition_id) ?? c.f.competition_id;
    const p2Input: P2EnrichInput = {
      home: c.f.home_team_name, away: c.f.away_team_name,
      competition: compName,
      dateUtc: c.f.kickoff_utc.slice(0, 10),
      formHome: computeForm(c.f.home_team_name, hist),
      formAway: computeForm(c.f.away_team_name, hist),
      pickUrl: pickId ? `${deps.siteUrl}/play/${pickId}` : null,
      pickAuthor: pickAuthorBy.get(c.f.id) ?? null,
      siteUrl: deps.siteUrl,
    };

    try {
      const enriched = await enrichPreviewP2(deps.p2!, p2Input);
      if (enriched) {
        // Fetch photos for hero image in row
        const { data: photoData } = await sb.from('player_photos')
          .select('player_name, team, image_url, credit, license')
          .or(`team.ilike.%${c.f.home_team_name}%,team.ilike.%${c.f.away_team_name}%`)
          .limit(4);
        const storageBase = `${(sb as unknown as { supabaseUrl: string }).supabaseUrl}/storage/v1/object/public/player-photos`;
        const photos = (photoData ?? []).map((p: { player_name: string; team: string; image_url: string; credit: string; license: string }) => ({
          player_name: p.player_name,
          team_name: p.team,
          photo_url: `${storageBase}/${p.image_url.replace(/^player-photos\//, '')}`,
          credit: p.credit,
          license: p.license,
        }));

        p2Rows.push(buildP2Row(c.slug, enriched, {
          competitionId: c.f.competition_id, matchId: c.f.livescore_match_id, pickId, publish: deps.autopublish, photos,
        }));
        log.info(`news-p2: enriched preview for ${c.f.home_team_name} vs ${c.f.away_team_name}`);
        continue;
      }
    } catch (err) {
      log.warn(`news-p2: enrichment failed for ${c.f.home_team_name} vs ${c.f.away_team_name}:`, err);
    }

    // P2 failed — fall back to P1 template
    const d: PreviewData = {
      home: c.f.home_team_name, away: c.f.away_team_name,
      competition: compName,
      dateUtc: c.f.kickoff_utc.slice(0, 10),
      formHome: computeForm(c.f.home_team_name, hist),
      formAway: computeForm(c.f.away_team_name, hist),
      pickUrl: pickId ? `${deps.siteUrl}/play/${pickId}` : null,
      pickAuthor: pickAuthorBy.get(c.f.id) ?? null,
    };
    p2Rows.push(buildRow('preview', c.slug, (lang) => renderPreview(lang, d), {
      competitionId: c.f.competition_id, matchId: c.f.livescore_match_id, pickId, publish: deps.autopublish,
    }));
    log.info(`news-p2: fell back to P1 for ${c.f.home_team_name} vs ${c.f.away_team_name}`);
  }

  return insertRows(deps, [...p1Rows, ...p2Rows]);
}

// ── Result scanner (FT within 24h, no item yet) ──────────────────────────────

interface MlsRow {
  id: string; home_team: string; away_team: string;
  home_score: number; away_score: number; kickoff_utc: string; competition: string;
}

export async function scanResults(deps: NewsGenDeps): Promise<number> {
  const { sb } = deps;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await sb.from('match_live_state')
    .select('id, home_team, away_team, home_score, away_score, kickoff_utc, competition')
    .eq('status', 'finished').not('home_score', 'is', null).gte('kickoff_utc', since);
  const fts = (data ?? []) as MlsRow[];
  if (fts.length === 0) return 0;

  const cands = fts
    .map((m) => ({ m, slug: buildMatchNewsSlug('result', m.home_team, m.away_team, m.kickoff_utc) }))
    .filter((c) => c.m.kickoff_utc && isSlugSafe(c.slug));
  const existing = await existingSlugs(sb, cands.map((c) => c.slug));
  const fresh = cands.filter((c) => !existing.has(c.slug));
  if (fresh.length === 0) return 0;

  const budget = DAILY_CAPS.result - await countTodayByType(sb, 'result');
  if (budget <= 0) return 0;

  const { data: fxData } = await sb.from('fixtures')
    .select('id, competition_id, livescore_match_id')
    .in('livescore_match_id', fresh.map((c) => c.m.id));
  const fxs = (fxData ?? []) as { id: string; competition_id: string; livescore_match_id: string }[];
  const fxByLs = new Map(fxs.map((f) => [f.livescore_match_id, f]));
  const comps = await getActiveComps(sb);
  const tierOf = new Map(comps.map((c) => [c.id, c.tier]));
  const { pickBy, pickAuthorBy, watchSet } = await pickWatchLookup(sb, fxs.map((f) => f.id));

  const chosen = prioritize(fresh.map((c) => {
    const fx = fxByLs.get(c.m.id) ?? null;
    return {
      ...c, fx,
      hasPick: fx ? pickBy.has(fx.id) : false, hasWatching: fx ? watchSet.has(fx.id) : false,
      tier: fx ? (tierOf.get(fx.competition_id) ?? 99) : 99, kickoffUtc: c.m.kickoff_utc,
    };
  }), budget);

  const rows = chosen.map((c) => {
    const pickId = c.fx ? (pickBy.get(c.fx.id) ?? null) : null;
    const d: ResultData = {
      home: c.m.home_team, away: c.m.away_team,
      homeScore: c.m.home_score, awayScore: c.m.away_score,
      competition: c.m.competition || 'football',
      dateUtc: c.m.kickoff_utc.slice(0, 10),
      pickUrl: pickId ? `${deps.siteUrl}/play/${pickId}` : null,
      pickAuthor: c.fx ? (pickAuthorBy.get(c.fx.id) ?? null) : null,
    };
    return buildRow('result', c.slug, (lang) => renderResult(lang, d), {
      competitionId: c.fx?.competition_id ?? null, matchId: c.m.id, pickId, publish: deps.autopublish,
    });
  });
  return insertRows(deps, rows);
}

// ── Standings (daily, comps with FT yesterday; D2-A: ≤1 lsFetch/comp) ────────

interface LsTableEntry { rank?: string; name?: string; matches?: string; points?: string }

export async function scanStandings(deps: NewsGenDeps, env: { key?: string; secret?: string }): Promise<number> {
  const { sb } = deps;
  if (!env.key || !env.secret) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const { data: yfxData } = await sb.from('fixtures')
    .select('competition_id, livescore_match_id')
    .gte('kickoff_utc', `${yday}T00:00:00Z`).lte('kickoff_utc', `${yday}T23:59:59Z`)
    .not('livescore_match_id', 'is', null);
  const yfx = (yfxData ?? []) as { competition_id: string; livescore_match_id: string }[];
  if (yfx.length === 0) return 0;

  const { data: finData } = await sb.from('match_live_state')
    .select('id').eq('status', 'finished').in('id', yfx.map((f) => f.livescore_match_id));
  const finSet = new Set(((finData ?? []) as { id: string }[]).map((r) => r.id));
  const ftCompIds = new Set(yfx.filter((f) => finSet.has(f.livescore_match_id)).map((f) => f.competition_id));
  if (ftCompIds.size === 0) return 0;

  const budget = Math.min(DAILY_CAPS.standings - await countTodayByType(sb, 'standings'), DAILY_CAPS.standings);
  if (budget <= 0) return 0;

  const comps = (await getActiveComps(sb))
    .filter((c) => ftCompIds.has(c.id) && c.livescore_id > 0)
    .slice(0, budget); // tier order = competitions row order
  const slugOf = new Map(comps.map((c) => [c.id, buildStandingsSlug(c.id, today)]));
  const existing = await existingSlugs(sb, [...slugOf.values()]);

  const rows: Record<string, unknown>[] = [];
  for (const comp of comps) { // sequential — quota politeness
    const slug = slugOf.get(comp.id)!;
    if (existing.has(slug) || !isSlugSafe(slug)) continue;
    const res = await lsFetch(`${LS_TABLE}?competition_id=${comp.livescore_id}&key=${env.key}&secret=${env.secret}&include_form=1`);
    const json = await res.json().catch(() => ({ success: false })) as { success: boolean; data?: { table?: LsTableEntry[] } };
    const table = json.success ? json.data?.table : null;
    if (!table?.length) continue;
    const d: StandingsData = {
      competition: comp.name, dateUtc: today,
      rows: table.slice(0, 5).map((e) => ({
        rank: parseInt(e.rank ?? '0', 10), name: e.name ?? '',
        played: parseInt(e.matches ?? '0', 10), points: parseInt(e.points ?? '0', 10),
      })),
    };
    rows.push(buildRow('standings', slug, (lang) => renderStandings(lang, d), {
      competitionId: comp.id, matchId: null, pickId: null, publish: deps.autopublish,
    }));
  }
  return insertRows(deps, rows);
}

// ── Cron wiring ──────────────────────────────────────────────────────────────

export function startNewsGenCron(cfg: {
  sb: SupabaseClient; env: NodeJS.ProcessEnv; siteUrl: string;
  revalidate: (tags: string[]) => Promise<void>;
  pingIndexNow: (urls: string[]) => Promise<void>;
}): () => void {
  const autopublish = cfg.env.NEWS_AUTOPUBLISH === 'true';
  // P2 deps: requires both Guardian + Anthropic keys — otherwise P2 is disabled (all previews stay P1)
  const guardianKey = cfg.env.GUARDIAN_API_KEY;
  const anthropicKey = cfg.env.ANTHROPIC_API_KEY;
  const p2Deps: P2Deps | null = guardianKey && anthropicKey
    ? { sb: cfg.sb, siteUrl: cfg.siteUrl, anthropicApiKey: anthropicKey, guardianApiKey: guardianKey }
    : null;
  if (p2Deps) log.info('news-gen: P2 enrichment enabled (Guardian + Sonnet)');
  else log.info('news-gen: P2 enrichment disabled (missing GUARDIAN_API_KEY or ANTHROPIC_API_KEY)');
  const deps: NewsGenDeps = {
    sb: cfg.sb, siteUrl: cfg.siteUrl, autopublish,
    revalidate: cfg.revalidate, pingIndexNow: cfg.pingIndexNow,
    p2: p2Deps,
  };
  const lsEnv = { key: cfg.env.LIVESCORE_API_KEY, secret: cfg.env.LIVESCORE_API_SECRET };
  const safe = (name: string, fn: () => Promise<number>) =>
    fn().then((n) => { if (n > 0) log.info(`news-gen: ${name} +${n} item(s)`); })
      .catch((err) => log.warn(`news-gen: ${name} failed:`, err));

  log.info(`news-gen: started (preview 45m, result 15m, standings ~06:30 UTC, autopublish=${autopublish})`);
  const previewTimer = setInterval(() => void safe('preview', () => scanPreviews(deps)), 45 * 60_000);
  const resultTimer = setInterval(() => void safe('result', () => scanResults(deps)), 15 * 60_000);
  let lastStandingsDay = '';
  const standingsTimer = setInterval(() => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getUTCHours() === 6 && now.getUTCMinutes() >= 30 && lastStandingsDay !== day) {
      lastStandingsDay = day;
      void safe('standings', () => scanStandings(deps, lsEnv));
    }
  }, 10 * 60_000);
  const boot = setTimeout(() => {
    void safe('preview', () => scanPreviews(deps));
    void safe('result', () => scanResults(deps));
  }, 45_000);

  return () => {
    clearInterval(previewTimer); clearInterval(resultTimer); clearInterval(standingsTimer);
    clearTimeout(boot);
    log.info('news-gen: stopped');
  };
}
