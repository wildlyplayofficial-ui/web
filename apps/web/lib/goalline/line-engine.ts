import { devig } from "@/lib/goalline/settlement";

/**
 * GoalLine Daily — Line Derivation Engine (spec section 4).
 *
 * Uses odds-api.io:
 * 1. Search events by team name via /events/search — ANY competition
 * 2. Fetch totals odds via /odds?eventId= — KHÔNG lọc nhà cái
 * 3. De-vig each match's totals
 * 4. Goal Line = sum of per-match fair totals, rounded to nearest .5
 * 5. Calibrate Over/Under odds from de-vigged probabilities
 *
 * KHÔNG hardcode nhà cái. Gói odds-api hiện tại (Starter cũ, 11 EUR/tháng) không
 * bao gồm sharp/exchange books — hỏi đích danh Sbobet là nhận 403. Lấy nhà cái nào
 * cũng được miễn có kèo Totals; nâng gói sau thì tự động ăn thêm sách tốt hơn.
 */

const ODDS_API_BASE = "https://api.odds-api.io/v3";

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

/** Search events by team name — mọi giải, không lọc theo giải nào. */
async function searchEvents(
  teamName: string,
  apiKey: string,
): Promise<OddsApiEvent[]> {
  const query = searchName(teamName);
  const res = await fetch(
    `${ODDS_API_BASE}/events/search?query=${encodeURIComponent(query)}&sport=football&apiKey=${apiKey}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const events = await res.json();
  return Array.isArray(events) ? (events as OddsApiEvent[]) : [];
}

/** So tên đội lỏng: "Man City" khớp "Manchester City". */
function looseMatch(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y.split(" ")[0]) || y.includes(x.split(" ")[0]);
}

/** Lấy kèo Totals từ nhà cái ĐẦU TIÊN có kèo đó, không kén tên nhà cái. */
async function fetchTotalsOdds(
  eventId: string,
  apiKey: string,
): Promise<{ overOdds: number; underOdds: number; point: number } | null> {
  const res = await fetch(
    `${ODDS_API_BASE}/odds?eventId=${eventId}&apiKey=${apiKey}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { bookmakers?: Record<string, unknown> };
  for (const markets of Object.values(data.bookmakers ?? {})) {
    if (!Array.isArray(markets)) continue;
    const totalsMarket = markets.find(
      (m: { name?: string }) => m?.name === "Totals",
    ) as { odds?: TotalsMarket[] } | undefined;
    const totals = totalsMarket?.odds?.[0];
    if (!totals) continue;
    return {
      overOdds: parseFloat(totals.over),
      underOdds: parseFloat(totals.under),
      point: totals.hdp,
    };
  }
  return null;
}

/** Match a livescore team to a WC event by searching odds-api. */
async function findEventForMatch(
  match: { homeTeam: string; awayTeam: string },
  apiKey: string,
): Promise<OddsApiEvent | null> {
  // Tên đội rỗng thì DỪNG. card-actions.ts gọi vào đây với homeTeam/awayTeam là ""
  // — không chặn thì looseMatch("","") trả true và vớ bừa trận đầu tiên tìm được.
  if (!match.homeTeam.trim() || !match.awayTeam.trim()) return null;

  // Trước đây chỉ khớp MỘT phía vì bộ lọc World Cup đã thu hẹp sẵn kết quả.
  // Bỏ bộ lọc đó rồi thì phải khớp CẢ HAI đội, kẻo vớ nhầm trận khác cùng tên đội.
  for (const teamName of [match.homeTeam, match.awayTeam]) {
    for (const ev of await searchEvents(teamName, apiKey)) {
      if (looseMatch(ev.home, match.homeTeam) && looseMatch(ev.away, match.awayTeam)) {
        return ev;
      }
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
