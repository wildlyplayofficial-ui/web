import { describe, expect, it } from 'vitest';
import {
  canSettleEarly,
  computePointsAdded,
  computeProfit,
  devig,
  isVoidable,
  settleCard,
} from './index';
import type { MatchForSettlement } from './index';

describe('settleCard', () => {
  it('returns over when total exceeds line', () => {
    expect(settleCard(8, 7.5)).toBe('over');
  });
  it('returns under when total is below line', () => {
    expect(settleCard(7, 7.5)).toBe('under');
  });
  it('returns under when total equals whole number with .5 line', () => {
    // .5 line means no push — 7 goals vs 7.5 = under
    expect(settleCard(7, 7.5)).toBe('under');
  });
  it('handles low-scoring game', () => {
    expect(settleCard(1, 2.5)).toBe('under');
    expect(settleCard(3, 2.5)).toBe('over');
  });
});

describe('canSettleEarly', () => {
  it('over clinches early when total exceeds line', () => {
    const result = canSettleEarly(8, 7.5, false);
    expect(result).toEqual({ canSettle: true, result: 'over' });
  });
  it('under cannot settle early while matches still in progress', () => {
    const result = canSettleEarly(5, 7.5, false);
    expect(result).toEqual({ canSettle: false });
  });
  it('under settles when all matches complete and total <= line', () => {
    const result = canSettleEarly(7, 7.5, true);
    expect(result).toEqual({ canSettle: true, result: 'under' });
  });
  it('over still clinches even if all matches complete', () => {
    const result = canSettleEarly(10, 7.5, true);
    expect(result).toEqual({ canSettle: true, result: 'over' });
  });
});

describe('devig', () => {
  it('returns fair odds from vigged market', () => {
    // Example: Over 1.90 / Under 1.90 (5% vig each side)
    const result = devig(1.9, 1.9);
    expect(result.fairOver).toBe(2);
    expect(result.fairUnder).toBe(2);
  });
  it('preserves asymmetry in de-vigged odds', () => {
    // Vigged: Over 2.10 / Under 1.75 → implied: 47.6% / 57.1% → sum 104.7%
    const result = devig(2.1, 1.75);
    expect(result.fairOver).toBeGreaterThan(2.1);
    expect(result.fairUnder).toBeGreaterThan(1.75);
    // Fair odds should be higher than vigged odds (less overround)
    expect(result.fairOver).toBeCloseTo(2.197, 2);
    expect(result.fairUnder).toBeCloseTo(1.832, 2);
  });
  it('Card #001 example: approx Over 48% / Under 52%', () => {
    // From spec: calibrated Over 2.00 / Under 1.85 (de-vigged 48/52)
    const result = devig(2.0, 1.85);
    const overProb = 1 / result.fairOver;
    const underProb = 1 / result.fairUnder;
    expect(overProb).toBeCloseTo(0.48, 1);
    expect(underProb).toBeCloseTo(0.52, 1);
  });
});

describe('isVoidable', () => {
  const finished: MatchForSettlement = {
    status: 'finished',
    validGoals: 3,
    isValidForSettlement: true,
  };
  const postponed: MatchForSettlement = {
    status: 'postponed',
    validGoals: 0,
    isValidForSettlement: true,
  };
  const abandoned: MatchForSettlement = {
    status: 'abandoned',
    validGoals: 1,
    isValidForSettlement: true,
  };
  const invalid: MatchForSettlement = {
    status: 'finished',
    validGoals: 2,
    isValidForSettlement: false,
  };

  it('returns false when all matches finished and valid', () => {
    expect(isVoidable([finished, finished, finished])).toBe(false);
  });
  it('returns true when any match postponed', () => {
    expect(isVoidable([finished, postponed, finished])).toBe(true);
  });
  it('returns true when any match abandoned', () => {
    expect(isVoidable([finished, finished, abandoned])).toBe(true);
  });
  it('returns false for invalid-but-not-terminal matches (live/scheduled)', () => {
    // isValidForSettlement=false alone does NOT void — only postponed/abandoned
    expect(isVoidable([finished, invalid, finished])).toBe(false);
  });
  it('returns false when matches are still live (not terminal-bad)', () => {
    const live: MatchForSettlement = { status: 'live', validGoals: 1, isValidForSettlement: true };
    expect(isVoidable([finished, live, finished])).toBe(false);
  });
});

describe('computeProfit', () => {
  it('win pays stake * odds - stake', () => {
    // Over 2.00, stake 100 → profit = 100*2 - 100 = 100
    expect(computeProfit(true, 100, 2.0)).toBe(100);
  });
  it('Card #001 Under win: 100 * 1.85 - 100 = 85', () => {
    expect(computeProfit(true, 100, 1.85)).toBe(85);
  });
  it('loss returns 0 net profit', () => {
    expect(computeProfit(false, 100, 2.0)).toBe(0);
  });
});

describe('computePointsAdded', () => {
  it('win: net_profit + participation', () => {
    // Over 2.00 win: 100 + 5 = 105
    expect(computePointsAdded('won', 100, 2.0, 5)).toBe(105);
  });
  it('loss: participation only', () => {
    expect(computePointsAdded('lost', 100, 2.0, 5)).toBe(5);
  });
  it('void: zero', () => {
    expect(computePointsAdded('void', 100, 2.0, 5)).toBe(0);
  });
});
