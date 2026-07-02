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

async function fetchKnockoutRoundsImpl(livescoreId: number): Promise<KnockoutRound[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];

  const today = new Date().toISOString().slice(0, 10);

  try {
    const [fixturesRes, historyRes] = await Promise.all([
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&size=100`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/matches/history.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&from=2026-06-28&to=${today}`,
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
          const id = String(m.fixture_id ?? m.id ?? "");
          matchMap.set(id, {
            id,
            round,
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

export function getKnockoutRounds(livescoreId: number): Promise<KnockoutRound[]> {
  return unstable_cache(
    () => fetchKnockoutRoundsImpl(livescoreId),
    [`knockout-rounds-${livescoreId}`],
    { revalidate: 600 },
  )();
}

async function fetchStandingsCompetitionsImpl(): Promise<StandingsCompetition[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("competitions")
    .select("id, name, short_name, season, livescore_id, slug, status")
    .order("id", { ascending: true });

  if (error) return [];

  return (data ?? []).map((r) => ({
    id: r.id as number,
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
