import { unstable_cache } from "next/cache";

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
const WC_COMPETITION_ID = 362;

export interface StandingTeam {
  rank: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  form: string; // e.g. "WWDL"
}

export interface GroupStanding {
  group: string;
  teams: StandingTeam[];
}

interface LivescoreTableEntry {
  rank?: string;
  name?: string;
  matches?: string;
  won?: string;
  drawn?: string;
  lost?: string;
  goals_scored?: string;
  goals_conceded?: string;
  goal_diff?: string;
  points?: string;
  group_id?: string;
  group_name?: string;
  form?: string; // e.g. "WWDL" — recent match results
}

function parseEntry(e: LivescoreTableEntry): StandingTeam {
  return {
    rank: parseInt(e.rank ?? "0", 10),
    name: e.name ?? "",
    played: parseInt(e.matches ?? "0", 10),
    won: parseInt(e.won ?? "0", 10),
    drawn: parseInt(e.drawn ?? "0", 10),
    lost: parseInt(e.lost ?? "0", 10),
    goals_for: parseInt(e.goals_scored ?? "0", 10),
    goals_against: parseInt(e.goals_conceded ?? "0", 10),
    goal_diff: parseInt(e.goal_diff ?? "0", 10),
    points: parseInt(e.points ?? "0", 10),
    form: e.form ?? "",
  };
}

async function fetchStandingsImpl(): Promise<GroupStanding[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];

  try {
    const res = await fetch(
      `${LIVESCORE_BASE}/leagues/table.json?competition_id=${WC_COMPETITION_ID}&key=${key}&secret=${secret}&include_form=1`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      success: boolean;
      data?: { table?: LivescoreTableEntry[] };
    };
    if (!data.success || !data.data?.table) return [];

    const groupMap = new Map<string, StandingTeam[]>();
    for (const entry of data.data.table) {
      const groupName = entry.group_name ?? entry.group_id ?? "?";
      const team = parseEntry(entry);
      const list = groupMap.get(groupName) ?? [];
      list.push(team);
      groupMap.set(groupName, list);
    }

    // Sort groups alphabetically, teams by rank within each group
    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, teams]) => ({
        group,
        teams: teams.sort((a, b) => a.rank - b.rank),
      }));
  } catch {
    return [];
  }
}

export const getStandings = unstable_cache(fetchStandingsImpl, ["wc-standings"], {
  revalidate: 600,
});
