import { devig } from "@/lib/goalline/settlement";

/**
 * GoalLine Daily — Line Derivation Engine (spec section 4).
 *
 * Uses odds-api.io:
 * 1. Search events by team name via /events/search — ANY competition
 * 2. Fetch totals odds via /odds?eventId= — no bookmaker filter
 * 3. De-vig each match's totals
 * 4. Goal Line = sum of per-match fair totals, rounded to nearest .5
 * 5. Calibrate Over/Under odds from de-vigged probabilities
 *
 * No hardcoded bookmaker: the current odds-api plan returns 403 for sharp and
 * exchange books, so we take whichever book carries a Totals market. Upgrading
 * the plan then picks up better books with no code change.
 */

import { goiOdds, khoaOdds } from "@/lib/odds-key";

/** Livescore → odds-api team name aliases. */
const SEARCH_ALIASES: Record<string, string> = {
  "Turkey": "Turkiye",
  "Czech Republic": "Czechia",
  "South Korea": "Korea Republic",
  "USA": "United States",
  "DR Congo": "Congo DR",
  "Ivory Coast": "Cote d'Ivoire",
  "Bosnia and Herzegovina": "Bosnia",
  "Bosnia Herzegovina": "Bosnia",
  "Bosnia & Herzegovina": "Bosnia",
};

function searchName(team: string): string {
  return SEARCH_ALIASES[team] ?? team;
}

interface OddsApiEvent {
  id: number;
  home: string;
  away: string;
  date: string;
  league: { slug: string };
  status: string;
}

interface TotalsMarket {
  hdp: number;
  over: string;
  under: string;
}

interface MatchLineResult {
  matchId: string;
  home: string;
  away: string;
  fairTotal: number;
  fairOverProb: number;
}

export interface DerivedLine {
  goalLine: number;
  overOdds: number;
  underOdds: number;
  perMatch: { matchId: string; home: string; away: string; fairTotal: number }[];
}

/** Round to nearest .5 — ALWAYS .5, never .0 (no push per spec §2). */
function roundToHalf(n: number): number {
  return Math.floor(n) + 0.5;
}

function roundOdds(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Search events by team name — any competition. Never throws. */
async function searchEvents(teamName: string): Promise<OddsApiEvent[]> {
  const query = searchName(teamName);
  try {
    const res = await goiOdds(`events/search?query=${encodeURIComponent(query)}&sport=football`, { cache: "no-store" });
    if (!res?.ok) return [];
    const events = await res.json();
    if (!Array.isArray(events)) return [];
    // The World Cup slug filter used to hide malformed entries; without it we
    // must reject events missing home/away ourselves, or teamMatches throws.
    return events.filter(
      (e): e is OddsApiEvent =>
        typeof e?.home === "string" && typeof e?.away === "string",
    );
  } catch {
    return [];
  }
}

// Team-name matcher ported from the canonical implementation in
// apps/worker/src/event-lookup.ts. Normalize both names, then require exact
// equality or full-string containment ("Bosnia" ↔ "Bosnia and Herzegovina").
// NOT first-token containment — that matched "Manchester City" to "Manchester
// United". Safety still rests on sameUtcDate + exactly-one below.
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teamMatches(apiName: string, inputName: string): boolean {
  const a = normalizeTeam(apiName);
  const b = normalizeTeam(inputName);
  if (a === "" || b === "") return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Same UTC calendar date — the source kickoff hour may be slightly off. */
function sameUtcDate(eventDate: string, kickoffUtc: string): boolean {
  if (!eventDate || !kickoffUtc) return false;
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === kickoffUtc.slice(0, 10);
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Aggregate the Totals market across ALL bookmakers, not the first one found.
 * Picking the first book made the goal line depend on odds-api's key order,
 * so two calls on the same match could return different lines. We take the
 * median hdp/over/under of every book that carries a valid main total.
 * The current odds-api plan returns 403 for sharp/exchange books, so we never
 * name a bookmaker — any book with a Totals market counts.
 */
async function fetchTotalsOdds(
  eventId: string,
): Promise<{ overOdds: number; underOdds: number; point: number } | null> {
  let data: { bookmakers?: Record<string, unknown> };
  try {
    const res = await goiOdds(`odds?eventId=${eventId}`, { cache: "no-store" });
    if (!res?.ok) return null;
    data = (await res.json()) as { bookmakers?: Record<string, unknown> };
  } catch {
    return null;
  }

  const points: number[] = [];
  const overs: number[] = [];
  const unders: number[] = [];
  for (const markets of Object.values(data.bookmakers ?? {})) {
    if (!Array.isArray(markets)) continue;
    // odds-api names this market "Totals" on some books, "Goals Over/Under"
    // on others (see apps/worker/src/clv.ts).
    const totalsMarket = markets.find(
      (m: { name?: string }) => m?.name === "Totals" || m?.name === "Goals Over/Under",
    ) as { odds?: TotalsMarket[] } | undefined;
    if (!Array.isArray(totalsMarket?.odds)) continue;
    // Main line = the row whose over/under implied probabilities are closest to
    // 50/50, not odds[0] (which may be an alternate line like 0.5 or 4.5).
    let best: { over: number; under: number; hdp: number } | null = null;
    let bestGap = Infinity;
    for (const row of totalsMarket.odds) {
      const over = parseFloat(row.over);
      const under = parseFloat(row.under);
      const hdp = Number(row.hdp);
      if (!Number.isFinite(over) || over <= 1) continue;
      if (!Number.isFinite(under) || under <= 1) continue;
      if (!Number.isFinite(hdp)) continue;
      const gap = Math.abs(1 / over - 1 / under);
      if (gap < bestGap) {
        bestGap = gap;
        best = { over, under, hdp };
      }
    }
    if (best) {
      points.push(best.hdp);
      overs.push(best.over);
      unders.push(best.under);
    }
  }

  if (points.length === 0) return null;
  return {
    overOdds: median(overs),
    underOdds: median(unders),
    point: median(points),
  };
}

/**
 * Match a livescore fixture to an odds-api event — any competition.
 * Both teams must match (in either home/away order) AND the kickoff must fall
 * on the same UTC date. Returns the event only when EXACTLY one qualifies
 * (0 or 2+ → null), so an ambiguous name never picks the wrong match.
 */
async function findEventForMatch(
  match: { homeTeam: string; awayTeam: string; kickoffUtc: string },
): Promise<OddsApiEvent | null> {
  // Empty team names → stop. card-actions.ts calls in with "" / "" and without
  // this guard teamMatches would false-positive on the first event found.
  if (!match.homeTeam.trim() || !match.awayTeam.trim() || !match.kickoffUtc) {
    return null;
  }

  // Search by both teams (their name may be the odd one out on a betting site),
  // dedupe by event id, then apply the strict matcher.
  const byId = new Map<number, OddsApiEvent>();
  for (const teamName of [match.homeTeam, match.awayTeam]) {
    for (const ev of await searchEvents(teamName)) {
      byId.set(ev.id, ev);
    }
  }

  // Compare against the ALIASED names (searchName), not the raw livescore names:
  // odds-api returns "United States", livescore says "USA". searchName maps the
  // livescore name onto the odds-api spelling before the equality test.
  const wantHome = searchName(match.homeTeam);
  const wantAway = searchName(match.awayTeam);
  const candidates = [...byId.values()].filter(
    (e) =>
      e.status !== "settled" &&
      sameUtcDate(e.date, match.kickoffUtc) &&
      ((teamMatches(e.home, wantHome) && teamMatches(e.away, wantAway)) ||
        (teamMatches(e.home, wantAway) && teamMatches(e.away, wantHome))),
  );
  return candidates.length === 1 ? candidates[0] : null;
}

/** Calibrate aggregate Over/Under odds from per-match de-vigged probabilities. */
function calibrateOdds(
  matchResults: { fairOverProb: number }[],
): { overOdds: number; underOdds: number } {
  const avgOverProb =
    matchResults.reduce((sum, m) => sum + m.fairOverProb, 0) / matchResults.length;
  const avgUnderProb = 1 - avgOverProb;
  return {
    overOdds: roundOdds(Math.max(1.01, 1 / avgOverProb)),
    underOdds: roundOdds(Math.max(1.01, 1 / avgUnderProb)),
  };
}

/**
 * Derive Goal Line + odds for 3 matches.
 * Matches come from livescore — maps to odds-api events by team name search.
 */
export async function deriveLineForMatches(
  matches: { id: string; homeTeam: string; awayTeam: string; kickoffUtc: string }[],
): Promise<DerivedLine | null> {
  if (khoaOdds().length === 0) return null;

  const results: MatchLineResult[] = [];

  for (const m of matches) {
    const event = await findEventForMatch(m);
    if (!event) return null;

    const totals = await fetchTotalsOdds(String(event.id));
    if (!totals) return null;

    const { fairOver, fairUnder } = devig(totals.overOdds, totals.underOdds);
    results.push({
      matchId: m.id,
      home: m.homeTeam,
      away: m.awayTeam,
      fairTotal: totals.point,
      fairOverProb: 1 / fairOver,
    });
  }

  const sumFairTotals = results.reduce((sum, r) => sum + r.fairTotal, 0);
  const goalLine = roundToHalf(sumFairTotals);
  const { overOdds, underOdds } = calibrateOdds(results);

  return {
    goalLine,
    overOdds,
    underOdds,
    perMatch: results.map(({ matchId, home, away, fairTotal }) => ({
      matchId, home, away, fairTotal,
    })),
  };
}
