import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import type { KnockoutRound, KnockoutMatch, StandingsCompetition } from "./standings";

const LIVESCORE_BASE = "https://livescore-api.com/api-client";

const KNOCKOUT_ROUNDS = ["R32", "R16", "QF", "SF", "3PPO", "F"] as const;
type KnockoutRoundCode = (typeof KNOCKOUT_ROUNDS)[number];

const ROUND_LABELS: Record<KnockoutRoundCode, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3PPO": "Third place",
  F: "Final",
};

function isKnockoutRound(r: string): r is KnockoutRoundCode {
  return (KNOCKOUT_ROUNDS as readonly string[]).includes(r);
}

function parseScore(scoreStr: string): { home: number; away: number } | null {
  const m = scoreStr.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

// The live feed has no `round` field. For a match not seen in any other feed,
// infer its round from the date ranges of matches already collected per round.
function inferRound(
  matchMap: Map<string, KnockoutMatch>,
  date: string,
): KnockoutRoundCode | null {
  if (!date) return null;
  for (const code of KNOCKOUT_ROUNDS) {
    const dates = [...matchMap.values()]
      .filter((m) => m.round === code && m.date)
      .map((m) => m.date)
      .sort();
    if (dates.length === 0) continue;
    if (date >= dates[0] && date <= dates[dates.length - 1]) return code;
  }
  return null;
}

async function fetchKnockoutRoundsImpl(livescoreId: number): Promise<KnockoutRound[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];

  // Rolling window: knockout stages of an ongoing tournament fall within the
  // last ~45 days; non-knockout rounds in the response are filtered out below.
  // "to" is padded +1 day so UTC date boundaries never exclude matches that
  // finished after local (UTC+7) midnight.
  const now = Date.now();
  const from = new Date(now - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 86_400_000).toISOString().slice(0, 10);
  const today = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);

  try {
    const [fixturesRes, historyRes, todayRes, yesterdayRes, liveRes] = await Promise.all([
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&size=100`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/matches/history.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&from=${from}&to=${to}`,
        { cache: "no-store" },
      ),
      // In-play matches drop out of the plain fixtures feed and aren't in
      // history yet. Day-scoped fixtures still list them (with a live `score`),
      // so fetch today + yesterday (for matches crossing UTC midnight).
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&date=${today}`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&date=${yesterday}`,
        { cache: "no-store" },
      ),
      // In-play + just-finished matches: fixtures purge past days and history
      // lags ~1h+ behind full time — this feed bridges that gap.
      fetch(
        `${LIVESCORE_BASE}/scores/live.json?competition_id=${livescoreId}&key=${key}&secret=${secret}`,
        { cache: "no-store" },
      ),
    ]);

    const matchMap = new Map<string, KnockoutMatch>();

    if (fixturesRes.ok) {
      const fd = (await fixturesRes.json()) as {
        success: boolean;
        data?: {
          fixtures?: Array<{
            id: string | number;
            round?: string;
            date?: string;
            time?: string;
            home_name?: string;
            away_name?: string;
          }>;
        };
      };
      if (fd.success && fd.data?.fixtures) {
        for (const f of fd.data.fixtures) {
          const round = (f.round ?? "").toUpperCase();
          if (!isKnockoutRound(round)) continue;
          const id = String(f.id);
          matchMap.set(id, {
            id,
            round,
            date: f.date ?? "",
            time: (f.time ?? "").slice(0, 5),
            homeName: f.home_name ?? "",
            awayName: f.away_name ?? "",
            homeScore: null,
            awayScore: null,
            finished: false,
          });
        }
      }
    }

    // Day-scoped fixtures include in-play matches with a live `score`;
    // they overwrite the plain-fixtures entries (adds live scores).
    for (const res of [yesterdayRes, todayRes]) {
      if (!res.ok) continue;
      const dd = (await res.json()) as {
        success: boolean;
        data?: {
          fixtures?: Array<{
            id: string | number;
            round?: string;
            date?: string;
            time?: string;
            home_name?: string;
            away_name?: string;
            score?: string;
          }>;
        };
      };
      if (!dd.success || !dd.data?.fixtures) continue;
      for (const f of dd.data.fixtures) {
        const round = (f.round ?? "").toUpperCase();
        if (!isKnockoutRound(round)) continue;
        const score = parseScore(f.score ?? "");
        const id = String(f.id);
        matchMap.set(id, {
          id,
          round,
          date: f.date ?? "",
          time: (f.time ?? "").slice(0, 5),
          homeName: f.home_name ?? "",
          awayName: f.away_name ?? "",
          homeScore: score?.home ?? null,
          awayScore: score?.away ?? null,
          finished: false,
        });
      }
    }

    // History overwrites fixtures for finished matches (prefer scores)
    if (historyRes.ok) {
      const hd = (await historyRes.json()) as {
        success: boolean;
        data?: {
          match?: Array<{
            fixture_id?: string | number;
            id?: string | number;
            round?: string;
            date?: string;
            scheduled?: string;
            home?: { name?: string };
            away?: { name?: string };
            scores?: { ft_score?: string };
            status?: string;
          }>;
        };
      };
      if (hd.success && hd.data?.match) {
        for (const m of hd.data.match) {
          const round = (m.round ?? "").toUpperCase();
          if (!isKnockoutRound(round)) continue;
          const score = parseScore(m.scores?.ft_score ?? "");
          // Only fixture_id matches fixtures/matches.json ids. A history match id
          // (m.id) lives in a different id-space and could collide with an
          // unrelated fixture — skip records without fixture_id instead.
          if (m.fixture_id == null) continue;
          const id = String(m.fixture_id);
          matchMap.set(id, {
            id,
            round,
            date: m.date ?? "",
            // history uses `scheduled` (fixtures use `time`); may be empty on
            // some records — acceptable, finished matches show scores instead
            time: (m.scheduled ?? "").slice(0, 5),
            homeName: m.home?.name ?? "",
            awayName: m.away?.name ?? "",
            homeScore: score?.home ?? null,
            awayScore: score?.away ?? null,
            finished: (m.status ?? "").toUpperCase() === "FINISHED",
          });
        }
      }
    }

    // Live feed last: updates known matches with live/just-finished scores,
    // and re-adds matches that fell through the gap (purged from fixtures,
    // not yet in history). Flat shape: home_name/away_name/score/status;
    // fixture_id joins the fixtures id-space; no `round` field.
    if (liveRes.ok) {
      const ld = (await liveRes.json()) as {
        success: boolean;
        data?: {
          match?: Array<{
            fixture_id?: string | number;
            id?: string | number;
            added?: string;
            scheduled?: string;
            home_name?: string;
            away_name?: string;
            score?: string;
            status?: string;
          }>;
        };
      };
      if (ld.success && ld.data?.match) {
        for (const m of ld.data.match) {
          if (m.fixture_id == null) continue;
          const id = String(m.fixture_id);
          const score = parseScore(m.score ?? "");
          const finished = (m.status ?? "").toUpperCase() === "FINISHED";
          const existing = matchMap.get(id);
          if (existing) {
            // History already has the official FT result — don't let the
            // (unofficial) live feed overwrite it.
            if (!existing.finished) {
              if (score) {
                existing.homeScore = score.home;
                existing.awayScore = score.away;
              }
              existing.finished = finished;
            }
            continue;
          }
          const date = (m.added ?? "").slice(0, 10);
          const round = inferRound(matchMap, date);
          if (!round) continue;
          matchMap.set(id, {
            id,
            round,
            date,
            time: (m.scheduled ?? "").slice(0, 5),
            homeName: m.home_name ?? "",
            awayName: m.away_name ?? "",
            homeScore: score?.home ?? null,
            awayScore: score?.away ?? null,
            finished,
          });
        }
      }
    }

    const result: KnockoutRound[] = [];
    for (const roundCode of KNOCKOUT_ROUNDS) {
      const matches = [...matchMap.values()]
        .filter((m) => m.round === roundCode)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      if (matches.length > 0) {
        result.push({ round: roundCode, label: ROUND_LABELS[roundCode], matches });
      }
    }

    return result;
  } catch {
    return [];
  }
}

// Note: unstable_cache includes fn args in the cache key
// (invocationKey = `${fixedKey}-${JSON.stringify(args)}`, next@16.2.9
// dist/server/web/spec-extension/unstable-cache.js:82), so distinct
// livescoreIds never collide.
export const getKnockoutRounds = unstable_cache(
  fetchKnockoutRoundsImpl,
  ["knockout-rounds"],
  { revalidate: 600 },
);

export interface FixtureDay {
  date: string;
  matches: KnockoutMatch[];
}

// League/regular-season schedule grouped by date. Unlike getKnockoutRounds this
// keeps every match (no knockout-round filter) and organises by calendar date.
// Reuses the KnockoutMatch shape so the standings page can render it with the
// same MatchCard (round is unused here, left "").
async function fetchCompetitionFixturesImpl(livescoreId: number): Promise<FixtureDay[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];

  // Recent finished results (last 14 days) + all upcoming fixtures.
  const now = Date.now();
  const from = new Date(now - 14 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 86_400_000).toISOString().slice(0, 10);

  try {
    const [fixturesRes, historyRes, liveRes] = await Promise.all([
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&size=100`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/matches/history.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&from=${from}&to=${to}`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/scores/live.json?competition_id=${livescoreId}&key=${key}&secret=${secret}`,
        { cache: "no-store" },
      ),
    ]);

    const matchMap = new Map<string, KnockoutMatch>();

    if (fixturesRes.ok) {
      const fd = (await fixturesRes.json()) as {
        success: boolean;
        data?: {
          fixtures?: Array<{
            id: string | number;
            date?: string;
            time?: string;
            home_name?: string;
            away_name?: string;
          }>;
        };
      };
      if (fd.success && fd.data?.fixtures) {
        for (const f of fd.data.fixtures) {
          const id = String(f.id);
          matchMap.set(id, {
            id,
            round: "",
            date: f.date ?? "",
            time: (f.time ?? "").slice(0, 5),
            homeName: f.home_name ?? "",
            awayName: f.away_name ?? "",
            homeScore: null,
            awayScore: null,
            finished: false,
          });
        }
      }
    }

    // History overwrites fixtures for finished matches (official FT scores).
    if (historyRes.ok) {
      const hd = (await historyRes.json()) as {
        success: boolean;
        data?: {
          match?: Array<{
            fixture_id?: string | number;
            round?: string;
            date?: string;
            scheduled?: string;
            home?: { name?: string };
            away?: { name?: string };
            scores?: { ft_score?: string };
            status?: string;
          }>;
        };
      };
      if (hd.success && hd.data?.match) {
        for (const m of hd.data.match) {
          if (m.fixture_id == null) continue;
          const id = String(m.fixture_id);
          const score = parseScore(m.scores?.ft_score ?? "");
          matchMap.set(id, {
            id,
            round: "",
            date: m.date ?? "",
            time: (m.scheduled ?? "").slice(0, 5),
            homeName: m.home?.name ?? "",
            awayName: m.away?.name ?? "",
            homeScore: score?.home ?? null,
            awayScore: score?.away ?? null,
            finished: (m.status ?? "").toUpperCase() === "FINISHED",
          });
        }
      }
    }

    // Live feed: in-play + just-finished scores that lag history. Updates known
    // matches; only overwrite when history hasn't posted the official result.
    if (liveRes.ok) {
      const ld = (await liveRes.json()) as {
        success: boolean;
        data?: {
          match?: Array<{
            fixture_id?: string | number;
            scheduled?: string;
            added?: string;
            home_name?: string;
            away_name?: string;
            score?: string;
            status?: string;
          }>;
        };
      };
      if (ld.success && ld.data?.match) {
        for (const m of ld.data.match) {
          if (m.fixture_id == null) continue;
          const id = String(m.fixture_id);
          const score = parseScore(m.score ?? "");
          const finished = (m.status ?? "").toUpperCase() === "FINISHED";
          const existing = matchMap.get(id);
          if (existing) {
            if (!existing.finished) {
              if (score) {
                existing.homeScore = score.home;
                existing.awayScore = score.away;
              }
              existing.finished = finished;
            }
            continue;
          }
          matchMap.set(id, {
            id,
            round: "",
            date: (m.added ?? "").slice(0, 10),
            time: (m.scheduled ?? "").slice(0, 5),
            homeName: m.home_name ?? "",
            awayName: m.away_name ?? "",
            homeScore: score?.home ?? null,
            awayScore: score?.away ?? null,
            finished,
          });
        }
      }
    }

    const byDate = new Map<string, KnockoutMatch[]>();
    for (const m of matchMap.values()) {
      if (!m.date) continue;
      const arr = byDate.get(m.date) ?? [];
      arr.push(m);
      byDate.set(m.date, arr);
    }

    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, matches]) => ({
        date,
        matches: matches.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  } catch {
    return [];
  }
}

export const getCompetitionFixtures = unstable_cache(
  fetchCompetitionFixturesImpl,
  ["competition-fixtures"],
  { revalidate: 600 },
);

async function fetchStandingsCompetitionsImpl(): Promise<StandingsCompetition[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("competitions")
    .select("id, name, short_name, season, livescore_id, slug, status")
    .order("id", { ascending: true });

  if (error) return [];

  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    shortName: (r.short_name ?? "") as string,
    season: (r.season ?? "") as string,
    livescoreId: r.livescore_id as number,
    slug: r.slug as string,
    status: r.status as string,
  }));
}

export const getStandingsCompetitions = unstable_cache(
  fetchStandingsCompetitionsImpl,
  ["standings-competitions"],
  { revalidate: 600 },
);
