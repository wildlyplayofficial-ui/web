/**
 * WildlyPlay settlement engine — pure, deterministic functions.
 *
 * True Asian-handicap math is computed in `RawOutcome` (win/half_win/push/half_loss/loss)
 * and `unitsPL`. The public W/L badge follows the display rule decided by Nick (QnA 11/6/2026):
 * half-win counts as WON, half-loss counts as LOST, push stays PUSH.
 */

export type Side = 'home' | 'away';
export type RawOutcome = 'win' | 'half_win' | 'push' | 'half_loss' | 'loss' | 'void';
export type DisplayStatus = 'won' | 'lost' | 'push' | 'void';

export interface Score {
  home: number;
  away: number;
}

/** Settle a single (non-quarter) handicap leg. `diff` = adjusted margin for the chosen side. */
function legOutcome(diff: number): 'win' | 'push' | 'loss' {
  if (diff > 0) return 'win';
  if (diff < 0) return 'loss';
  return 'push';
}

function combineLegs(a: 'win' | 'push' | 'loss', b: 'win' | 'push' | 'loss'): RawOutcome {
  if (a === b) return a === 'push' ? 'push' : a;
  const set = [a, b].sort().join('+'); // sorted: loss < push < win
  if (set === 'push+win') return 'half_win';
  if (set === 'loss+push') return 'half_loss';
  // 'loss+win' cannot occur with legs 0.25 apart
  throw new Error(`impossible leg combination: ${a}+${b}`);
}

function isQuarterLine(line: number): boolean {
  return Math.abs((line * 4) % 2) === 1; // .25 or .75 fractions
}

/**
 * Asian handicap. `line` is from the perspective of the chosen side
 * (e.g. "Home -0.5" → side='home', line=-0.5; "Away +0.25" → side='away', line=0.25).
 */
export function settleAsianHandicap(side: Side, line: number, score: Score): RawOutcome {
  const margin = side === 'home' ? score.home - score.away : score.away - score.home;
  if (isQuarterLine(line)) {
    return combineLegs(legOutcome(margin + (line - 0.25)), legOutcome(margin + (line + 0.25)));
  }
  return legOutcome(margin + line);
}

/** Over/Under total goals, supports quarter lines (e.g. Over 2.25). */
export function settleOverUnder(pick: 'over' | 'under', line: number, score: Score): RawOutcome {
  const total = score.home + score.away;
  const diff = (l: number) => (pick === 'over' ? total - l : l - total);
  if (isQuarterLine(line)) {
    return combineLegs(legOutcome(diff(line - 0.25)), legOutcome(diff(line + 0.25)));
  }
  return legOutcome(diff(line));
}

/** 1X2 full-time result. */
export function settle1x2(selection: 'home' | 'draw' | 'away', score: Score): RawOutcome {
  const result = score.home > score.away ? 'home' : score.home < score.away ? 'away' : 'draw';
  return result === selection ? 'win' : 'loss';
}

/** Both teams to score. */
export function settleBtts(selection: 'yes' | 'no', score: Score): RawOutcome {
  const both = score.home > 0 && score.away > 0;
  return (selection === 'yes') === both ? 'win' : 'loss';
}

/** Real profit/loss in units (decimal odds). */
export function unitsPL(outcome: RawOutcome, odds: number, stake: number): number {
  switch (outcome) {
    case 'win':       return round2(stake * (odds - 1));
    case 'half_win':  return round2((stake / 2) * (odds - 1));
    case 'push':
    case 'void':      return 0;
    case 'half_loss': return round2(-stake / 2);
    case 'loss':      return round2(-stake);
  }
}

/** Public badge per Nick's display rule: half counts as full W/L. */
export function displayStatus(outcome: RawOutcome): DisplayStatus {
  switch (outcome) {
    case 'win':
    case 'half_win':  return 'won';
    case 'loss':
    case 'half_loss': return 'lost';
    case 'push':      return 'push';
    case 'void':      return 'void';
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
