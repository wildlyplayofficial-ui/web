import { unstable_cache } from "next/cache";

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
const WC_COMPETITION_ID = 362;
const EPL_COMPETITION_ID = 2;

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
  form: string;
  groupName: string;
  stageName: string;
}

export interface GroupStanding {
  group: string;
  teams: StandingTeam[];
}

export interface KnockoutMatch {
  id: string;
  round: string;
  date: string;
  time: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
}

export interface KnockoutRound {
  round: string;
  label: string;
  matches: KnockoutMatch[];
}

export interface StandingsCompetition {
  id: number;
  name: string;
  shortName: string;
  season: string;
  livescoreId: number;
  slug: string;
  status: string;
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
  stage_name?: string;
  form?: string;
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
    groupName: e.group_name ?? e.group_id ?? "",
    stageName: e.stage_name ?? "",
  };
}

async function fetchCompetitionTableImpl(livescoreId: number): Promise<StandingTeam[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];

  try {
    const res = await fetch(
      `${LIVESCORE_BASE}/leagues/table.json?competition_id=${livescoreId}&key=${key}&secret=${secret}&include_form=1`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      success: boolean;
      data?: { table?: LivescoreTableEntry[] };
    };
    if (!data.success || !data.data?.table) return [];

    return data.data.table.map(parseEntry);
  } catch {
    return [];
  }
}

/** Generic table fetch for any competition. Cached 600s; livescoreId is part of the cache key (fn arg). */
export const fetchCompetitionTable = unstable_cache(
  fetchCompetitionTableImpl,
  ["competition-table"],
  { revalidate: 600 },
);

function groupsFromTable(rows: StandingTeam[]): GroupStanding[] {
  const groupMap = new Map<string, StandingTeam[]>();
  for (const entry of rows) {
    const groupName = entry.groupName || "?";
    const list = groupMap.get(groupName) ?? [];
    list.push(entry);
    groupMap.set(groupName, list);
  }
  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, teams]) => ({
      group,
      teams: teams.sort((a, b) => a.rank - b.rank),
    }));
}

async function fetchStandingsImpl(): Promise<GroupStanding[]> {
  const rows = await fetchCompetitionTableImpl(WC_COMPETITION_ID);
  return groupsFromTable(rows);
}

export const getStandings = unstable_cache(fetchStandingsImpl, ["wc-standings"], {
  revalidate: 600,
});

async function fetchEplStandingsImpl(): Promise<StandingTeam[]> {
  const rows = await fetchCompetitionTableImpl(EPL_COMPETITION_ID);
  return rows.sort((a, b) => a.rank - b.rank);
}

export const getEplStandings = unstable_cache(fetchEplStandingsImpl, ["epl-standings"], {
  revalidate: 600,
});
