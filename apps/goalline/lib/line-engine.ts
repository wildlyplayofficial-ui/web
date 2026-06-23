import { devig } from "@wildlyplay/goalline-settlement";

/**
 * GoalLine Daily — Line Derivation Engine (spec section 4).
 *
 * 1. Fetch totals market from odds-api.io for each selected match.
 * 2. De-vig each match's main total using the settlement package.
 * 3. Goal Line = sum of per-match fair totals, rounded to nearest .5.
 * 4. Calibrate Over/Under odds from the true de-vigged probabilities.
 */

interface OddsApiOutcome {
  name: string;
  price: number;
  point: number;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  markets: OddsApiMarket[];
}

interface OddsApiResponse {
  id: string;
  bookmakers: OddsApiBookmaker[];
}

interface MatchLineResult {
  matchId: string;
  fairTotal: number;
}

interface DerivedLine {
  goalLine: number;
  overOdds: number;
  underOdds: number;
  perMatch: MatchLineResult[];
}

/** Round to nearest .5 — ALWAYS .5, never .0 (no push guaranteed per spec §2). */
function roundToHalf(n: number): number {
  return Math.floor(n) + 0.5;
}

/** Round odds to 2 decimal places. */
function roundOdds(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Extract the main totals market from the first bookmaker in the response.
 * Returns the Over and Under odds + the point (line), or null if unavailable.
 */
function extractTotalsMarket(
  data: OddsApiResponse,
): { overOdds: number; underOdds: number; point: number } | null {
  for (const bookmaker of data.bookmakers) {
    const totals = bookmaker.markets.find((m) => m.key === "totals");
    if (!totals) continue;

    const over = totals.outcomes.find((o) => o.name === "Over");
    const under = totals.outcomes.find((o) => o.name === "Under");
    if (!over || !under) continue;

    return {
      overOdds: over.price,
      underOdds: under.price,
      point: over.point,
    };
  }
  return null;
}

/**
 * Fetch totals odds for a single match from odds-api.io.
 * Returns null on any error (network, missing data, etc).
 */
async function fetchMatchTotals(
  eventId: string,
  apiKey: string,
): Promise<{ overOdds: number; underOdds: number; point: number } | null> {
  const url = `https://api.odds-api.io/v3/events/${eventId}/odds?apiKey=${apiKey}&markets=totals`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as OddsApiResponse;
    return extractTotalsMarket(data);
  } catch {
    return null;
  }
}

/**
 * Derive the fair total for a single match.
 *
 * De-vig the Over/Under odds. The "fair total" is the bookmaker's main line
 * (the point). We use the de-vigged probabilities later for aggregate
 * odds calibration.
 *
 * Returns the point (fair total for summation) and the de-vigged probabilities.
 */
function deriveMatchFairTotal(market: {
  overOdds: number;
  underOdds: number;
  point: number;
}): { fairTotal: number; fairOverProb: number; fairUnderProb: number } {
  const { fairOver, fairUnder } = devig(market.overOdds, market.underOdds);
  const fairOverProb = 1 / fairOver;
  const fairUnderProb = 1 / fairUnder;

  return {
    fairTotal: market.point,
    fairOverProb,
    fairUnderProb,
  };
}

/**
 * Calibrate aggregate Over/Under odds from per-match de-vigged probabilities.
 *
 * The aggregate line is the sum of per-match totals rounded to .5.
 * We approximate the aggregate probability by averaging the per-match
 * Over probabilities (since the matches are independent, the aggregate
 * probability of going over the sum-line tracks closely with the average
 * per-match lean when each match's line is at its market-implied total).
 *
 * Odds = 1 / probability, with a floor of 1.01 to prevent impossible payouts.
 */
function calibrateOdds(
  matchResults: { fairOverProb: number; fairUnderProb: number }[],
): { overOdds: number; underOdds: number } {
  const avgOverProb =
    matchResults.reduce((sum, m) => sum + m.fairOverProb, 0) /
    matchResults.length;
  const avgUnderProb = 1 - avgOverProb;

  return {
    overOdds: roundOdds(Math.max(1.01, 1 / avgOverProb)),
    underOdds: roundOdds(Math.max(1.01, 1 / avgUnderProb)),
  };
}

/**
 * Derive the Goal Line, Over/Under odds, and per-match fair totals
 * from the odds-api.io totals market for a set of match IDs.
 *
 * matchIds are the external_match_id values (odds-api event IDs).
 * Returns null if any match's odds cannot be fetched.
 */
export async function deriveLineFromMatches(
  matchIds: string[],
): Promise<DerivedLine | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  const markets = await Promise.all(
    matchIds.map((id) => fetchMatchTotals(id, apiKey)),
  );

  // All matches must have totals data
  if (markets.some((m) => m === null)) return null;

  const validMarkets = markets as NonNullable<(typeof markets)[number]>[];

  const matchResults = validMarkets.map((market, i) => {
    const derived = deriveMatchFairTotal(market);
    return {
      matchId: matchIds[i],
      fairTotal: derived.fairTotal,
      fairOverProb: derived.fairOverProb,
      fairUnderProb: derived.fairUnderProb,
    };
  });

  const sumFairTotals = matchResults.reduce(
    (sum, m) => sum + m.fairTotal,
    0,
  );
  const goalLine = roundToHalf(sumFairTotals);

  const { overOdds, underOdds } = calibrateOdds(matchResults);

  return {
    goalLine,
    overOdds,
    underOdds,
    perMatch: matchResults.map(({ matchId, fairTotal }) => ({
      matchId,
      fairTotal,
    })),
  };
}
