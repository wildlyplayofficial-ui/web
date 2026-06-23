import { devig } from "@/lib/goalline/settlement";

/**
 * GoalLine Daily — Line Derivation Engine (spec section 4).
 *
 * Uses odds-api.io:
 * 1. Search WC events by team name via /events/search
 * 2. Fetch Sbobet totals odds via /odds?eventId=&bookmakers=Sbobet
 * 3. De-vig each match's totals
 * 4. Goal Line = sum of per-match fair totals, rounded to nearest .5
 * 5. Calibrate Over/Under odds from de-vigged probabilities
 */

const ODDS_API_BASE = "https://api.odds-api.io/v3";
const BOOKMAKER = "Sbobet";

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

/** Search for a WC event matching a team name. */
async function searchEvent(
  teamName: string,
  apiKey: string,
): Promise<OddsApiEvent | null> {
  const query = searchName(teamName);
  const res = await fetch(
    `${ODDS_API_BASE}/events/search?query=${encodeURIComponent(query)}&sport=football&apiKey=${apiKey}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const events = (await res.json()) as OddsApiEvent[];
  // Prefer WC events
  return events.find((e) => e.league?.slug === "international-fifa-world-cup") ?? null;
}

/** Fetch totals odds from Sbobet for an event. */
async function fetchTotalsOdds(
  eventId: string,
  apiKey: string,
): Promise<{ overOdds: number; underOdds: number; point: number } | null> {
  const res = await fetch(
    `${ODDS_API_BASE}/odds?eventId=${eventId}&bookmakers=${BOOKMAKER}&apiKey=${apiKey}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;

  const data = await res.json();
  const bookmakers = data.bookmakers ?? {};
  const bm = bookmakers[BOOKMAKER];
  if (!Array.isArray(bm)) return null;

  const totalsMarket = bm.find((m: { name: string }) => m.name === "Totals");
  if (!totalsMarket?.odds?.[0]) return null;

  const totals = totalsMarket.odds[0] as TotalsMarket;
  return {
    overOdds: parseFloat(totals.over),
    underOdds: parseFloat(totals.under),
    point: totals.hdp,
  };
}

/** Match a livescore team to a WC event by searching odds-api. */
async function findEventForMatch(
  match: { homeTeam: string; awayTeam: string },
  apiKey: string,
): Promise<OddsApiEvent | null> {
  // Try home team first, then away
  const byHome = await searchEvent(match.homeTeam, apiKey);
  if (byHome) {
    const awayLower = match.awayTeam.toLowerCase();
    if (byHome.away.toLowerCase().includes(awayLower.split(" ")[0]) ||
        awayLower.includes(byHome.away.toLowerCase().split(" ")[0])) {
      return byHome;
    }
  }
  const byAway = await searchEvent(match.awayTeam, apiKey);
  if (byAway) {
    const homeLower = match.homeTeam.toLowerCase();
    if (byAway.home.toLowerCase().includes(homeLower.split(" ")[0]) ||
        homeLower.includes(byAway.home.toLowerCase().split(" ")[0])) {
      return byAway;
    }
  }
  return null;
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
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  const results: MatchLineResult[] = [];

  for (const m of matches) {
    const event = await findEventForMatch(m, apiKey);
    if (!event) return null;

    const totals = await fetchTotalsOdds(String(event.id), apiKey);
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

/** Fetch upcoming WC events (for auto-create cron). */
export async function fetchWcEvents(apiKey: string): Promise<OddsApiEvent[]> {
  const res = await fetch(
    `${ODDS_API_BASE}/events?sport=football&apiKey=${apiKey}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const events = (await res.json()) as OddsApiEvent[];
  return events.filter(
    (e) => e.league?.slug === "international-fifa-world-cup" && e.status !== "settled",
  );
}
