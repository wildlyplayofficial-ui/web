/**
 * GoalLine Daily — settlement engine.
 *
 * Pure, deterministic functions. No side effects, no I/O.
 * The aggregate line is always .5, so no push is possible.
 *
 * Settlement asymmetry (spec §6):
 *   - OVER can settle early: total > line → Over wins immediately.
 *   - UNDER never settles early: requires all matches complete AND total <= line.
 *
 * Void rule (spec §6): any match not completed → void UNLESS Over already clinched.
 */

export type PickSide = 'over' | 'under';

export interface MatchForSettlement {
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'abandoned';
  validGoals: number;
  isValidForSettlement: boolean;
}

/** Binary settle: total goals vs. the goal line (.5 line → no push). */
export function settleCard(totalGoals: number, goalLine: number): PickSide {
  return totalGoals > goalLine ? 'over' : 'under';
}

/**
 * Early settlement check (asymmetric — spec §6).
 * Over can clinch mid-card once total > line.
 * Under can NEVER settle early while any match is live/unstarted.
 */
export function canSettleEarly(
  totalGoals: number,
  goalLine: number,
  allMatchesComplete: boolean,
): { canSettle: boolean; result?: PickSide } {
  if (totalGoals > goalLine) {
    return { canSettle: true, result: 'over' };
  }
  if (allMatchesComplete && totalGoals <= goalLine) {
    return { canSettle: true, result: 'under' };
  }
  return { canSettle: false };
}

/**
 * De-vig a two-way market to fair probabilities.
 *
 * Uses multiplicative (power method) de-vig:
 *   impliedP = 1/odds
 *   fairP = impliedP / (impliedOver + impliedUnder)
 *   fairOdds = 1/fairP
 */
export function devig(
  overOdds: number,
  underOdds: number,
): { fairOver: number; fairUnder: number } {
  const implOver = 1 / overOdds;
  const implUnder = 1 / underOdds;
  const total = implOver + implUnder;
  return {
    fairOver: round3(total / implOver),
    fairUnder: round3(total / implUnder),
  };
}

/**
 * Check if the card should be voided (spec §6).
 * Void if ANY match has a terminal-bad status (postponed/abandoned).
 * Scheduled/live matches are NOT voidable — they just mean "not settleable yet".
 * The void-unless-Over-clinched rule is handled by the caller.
 */
export function isVoidable(matches: MatchForSettlement[]): boolean {
  return matches.some(
    (m) => m.status === 'postponed' || m.status === 'abandoned',
  );
}

/**
 * Compute net profit for a pick (spec §9).
 * Win: stake * odds - stake. Loss: 0 net. Participation bonus added separately.
 */
export function computeProfit(
  won: boolean,
  stakePoints: number,
  oddsLocked: number,
): number {
  if (won) return round2(stakePoints * oddsLocked - stakePoints);
  return 0;
}

/**
 * Total points added for a pick (spec §9).
 * Win: net_profit + participation. Loss: participation only. Void: 0.
 */
export function computePointsAdded(
  status: 'won' | 'lost' | 'void',
  stakePoints: number,
  oddsLocked: number,
  participationBonus: number,
): number {
  if (status === 'void') return 0;
  const profit = status === 'won' ? computeProfit(true, stakePoints, oddsLocked) : 0;
  return round2(profit + participationBonus);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
