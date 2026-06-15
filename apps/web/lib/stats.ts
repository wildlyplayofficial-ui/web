import type { Pick } from "./types";

/**
 * Aggregations for the Stats page — everything derives from a single
 * getSettledPicks() result. W/L/P counts use the status field directly
 * (half-wins are already mapped to 'won' by the settlement engine).
 */

export interface GroupStats {
  key: string;
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  units_pl: number;
}

export interface StatsSummary extends Omit<GroupStats, "key"> {
  /** units_pl / total staked units, in % — null when nothing was staked. */
  roi: number | null;
  /** Mean CLV % across picks with a captured close — null when none. */
  avgClv: number | null;
}

function tally(picks: Pick[]): Omit<GroupStats, "key"> {
  return {
    settled: picks.length,
    wins: picks.filter((p) => p.status === "won").length,
    losses: picks.filter((p) => p.status === "lost").length,
    pushes: picks.filter((p) => p.status === "push").length,
    units_pl: Math.round(picks.reduce((sum, p) => sum + (p.units_pl ?? 0), 0) * 100) / 100,
  };
}

export function summarize(picks: Pick[]): StatsSummary {
  const base = tally(picks);
  const staked = picks.reduce((sum, p) => sum + p.stake_units, 0);
  // CLV per pick = (odds_publish / odds_close − 1) × 100, same as the play page.
  const clvs = picks
    .filter((p) => p.odds_close !== null)
    .map((p) => (p.odds_publish / (p.odds_close as number) - 1) * 100);
  return {
    ...base,
    roi: staked > 0 ? (base.units_pl / staked) * 100 : null,
    avgClv: clvs.length > 0 ? clvs.reduce((a, b) => a + b, 0) / clvs.length : null,
  };
}

/** Group settled picks (e.g. by league or market), sorted by settled count desc. */
export function groupStats(picks: Pick[], keyOf: (pick: Pick) => string): GroupStats[] {
  const groups = new Map<string, Pick[]>();
  for (const pick of picks) {
    const key = keyOf(pick);
    groups.set(key, [...(groups.get(key) ?? []), pick]);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...tally(group) }))
    .sort((a, b) => b.settled - a.settled || a.key.localeCompare(b.key));
}

/** Running units P/L ordered by kickoff ascending — one point per settled pick. */
export function cumulativeUnits(picks: Pick[]): { date: string; total: number }[] {
  let total = 0;
  return [...picks]
    .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))
    .map((pick) => {
      total = Math.round((total + (pick.units_pl ?? 0)) * 100) / 100;
      return { date: pick.kickoff_utc, total };
    });
}
