import { describe, expect, it } from 'vitest';
import {
  displayStatus,
  settle1x2,
  settleAsianHandicap,
  settleBtts,
  settleOverUnder,
  unitsPL,
} from './index';

const s = (home: number, away: number) => ({ home, away });

describe('settleAsianHandicap — full and half lines', () => {
  it('Home -0.5 wins when home wins by 1', () => {
    expect(settleAsianHandicap('home', -0.5, s(1, 0))).toBe('win');
  });
  it('Home -0.5 loses on a draw', () => {
    expect(settleAsianHandicap('home', -0.5, s(1, 1))).toBe('loss');
  });
  it('Home -1 pushes when home wins by exactly 1', () => {
    expect(settleAsianHandicap('home', -1, s(2, 1))).toBe('push');
  });
  it('Away +1 pushes when away loses by exactly 1', () => {
    expect(settleAsianHandicap('away', 1, s(2, 1))).toBe('push');
  });
  it('Away +1.5 wins when away loses by 1', () => {
    expect(settleAsianHandicap('away', 1.5, s(2, 1))).toBe('win');
  });
  it('Home 0 (level ball) pushes on draw', () => {
    expect(settleAsianHandicap('home', 0, s(0, 0))).toBe('push');
  });
});

describe('settleAsianHandicap — quarter lines', () => {
  it('Home -0.25 half-loses on a draw', () => {
    expect(settleAsianHandicap('home', -0.25, s(1, 1))).toBe('half_loss');
  });
  it('Home +0.25 half-wins on a draw', () => {
    expect(settleAsianHandicap('home', 0.25, s(1, 1))).toBe('half_win');
  });
  it('Home -0.75 half-wins when home wins by exactly 1', () => {
    expect(settleAsianHandicap('home', -0.75, s(1, 0))).toBe('half_win');
  });
  it('Home -0.75 wins fully when home wins by 2', () => {
    expect(settleAsianHandicap('home', -0.75, s(2, 0))).toBe('win');
  });
  it('Home -1.25 half-loses when home wins by exactly 1', () => {
    expect(settleAsianHandicap('home', -1.25, s(2, 1))).toBe('half_loss');
  });
  it('Away +1.75 half-loses when away loses by 2', () => {
    expect(settleAsianHandicap('away', 1.75, s(3, 1))).toBe('half_loss');
  });
});

describe('settleOverUnder', () => {
  it('Over 2.5 wins with 3 goals', () => {
    expect(settleOverUnder('over', 2.5, s(2, 1))).toBe('win');
  });
  it('Under 2.5 wins with 2 goals', () => {
    expect(settleOverUnder('under', 2.5, s(1, 1))).toBe('win');
  });
  it('Over 2 pushes with exactly 2 goals', () => {
    expect(settleOverUnder('over', 2, s(1, 1))).toBe('push');
  });
  it('Over 2.25 half-loses with exactly 2 goals', () => {
    expect(settleOverUnder('over', 2.25, s(2, 0))).toBe('half_loss');
  });
  it('Under 2.25 half-wins with exactly 2 goals', () => {
    expect(settleOverUnder('under', 2.25, s(2, 0))).toBe('half_win');
  });
  it('Over 2.75 half-wins with exactly 3 goals', () => {
    expect(settleOverUnder('over', 2.75, s(2, 1))).toBe('half_win');
  });
});

describe('settle1x2 / settleBtts', () => {
  it('home selection wins on home victory', () => {
    expect(settle1x2('home', s(2, 0))).toBe('win');
  });
  it('draw selection wins on draw', () => {
    expect(settle1x2('draw', s(1, 1))).toBe('win');
  });
  it('away selection loses on draw', () => {
    expect(settle1x2('away', s(1, 1))).toBe('loss');
  });
  it('btts yes wins when both score', () => {
    expect(settleBtts('yes', s(2, 1))).toBe('win');
  });
  it('btts no loses when both score', () => {
    expect(settleBtts('no', s(2, 1))).toBe('loss');
  });
});

describe('unitsPL — real AH math', () => {
  it('full win pays stake*(odds-1)', () => {
    expect(unitsPL('win', 1.9, 1)).toBe(0.9);
  });
  it('half win pays half', () => {
    expect(unitsPL('half_win', 1.9, 1)).toBe(0.45);
  });
  it('push and void pay zero', () => {
    expect(unitsPL('push', 1.9, 1)).toBe(0);
    expect(unitsPL('void', 1.9, 1)).toBe(0);
  });
  it('half loss costs half the stake', () => {
    expect(unitsPL('half_loss', 1.9, 2)).toBe(-1);
  });
  it('full loss costs the stake', () => {
    expect(unitsPL('loss', 1.9, 2)).toBe(-2);
  });
});

describe('displayStatus — Nick rule: half counts as full', () => {
  it('half_win shows as won', () => {
    expect(displayStatus('half_win')).toBe('won');
  });
  it('half_loss shows as lost', () => {
    expect(displayStatus('half_loss')).toBe('lost');
  });
  it('push stays push', () => {
    expect(displayStatus('push')).toBe('push');
  });
});
