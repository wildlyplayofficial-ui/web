import { describe, expect, it } from 'vitest';
import { detectPolarityInversion } from './news';

describe('detectPolarityInversion', () => {
  it('flags a disclosed disadvantage rendered as hype vocabulary (the live regression case)', () => {
    const body = 'Consensus pricing suggests roughly a 5% edge, and internal quantification places this at breakeven-at-best.';
    expect(detectPolarityInversion(-5, body)).toMatch(/polarity inversion suspected/);
  });

  it('does not flag when the disadvantage is described honestly', () => {
    const body = 'Consensus pricing put this pick at roughly minus five percent — a judgment call, not an edge claim.';
    expect(detectPolarityInversion(-5, body)).toBeNull();
  });

  it('does not flag a genuine positive edge', () => {
    const body = 'Consensus pricing suggests roughly a 5% edge on this line.';
    expect(detectPolarityInversion(5, body)).toBeNull();
  });

  it('does not flag when no structured figure was provided', () => {
    expect(detectPolarityInversion(null, 'This is a 5% edge, no doubt.')).toBeNull();
  });
});
