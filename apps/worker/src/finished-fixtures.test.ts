import { describe, expect, it } from 'vitest';
import { mapFinishedFixtures } from './finished-fixtures';

const raw = (overrides: Partial<{ home: string; away: string; date: string; scheduled: string; time: string; ft_score: string }> = {}) => {
  const o = {
    home: 'Germany', away: 'Paraguay', date: '2026-06-30', scheduled: '01:00', time: 'AP', ft_score: '1 - 1',
    ...overrides,
  };
  return {
    home: { name: o.home },
    away: { name: o.away },
    date: o.date,
    scheduled: o.scheduled,
    time: o.time,
    scores: { ft_score: o.ft_score },
  };
};

describe('mapFinishedFixtures — R0 Triage fatigue signal (Nick 4/7)', () => {
  it('maps a penalty-shootout match: AP → PEN, score is the full-time score (pre-shootout)', () => {
    const [f] = mapFinishedFixtures([raw()]);
    expect(f).toEqual({
      home: 'Germany', away: 'Paraguay', ko_utc: '2026-06-30T01:00:00Z', score: '1-1', status: 'PEN',
    });
  });

  it('maps a regulation finish: FT → FT', () => {
    const [f] = mapFinishedFixtures([raw({ time: 'FT', ft_score: '2 - 0' })]);
    expect(f.status).toBe('FT');
    expect(f.score).toBe('2-0');
  });

  it('maps an extra-time finish: AET → AET', () => {
    const [f] = mapFinishedFixtures([raw({ time: 'AET', ft_score: '2 - 2' })]);
    expect(f.status).toBe('AET');
  });

  it('drops matches with an unrecognized/in-progress time code', () => {
    const result = mapFinishedFixtures([raw({ time: 'NS' })]);
    expect(result).toEqual([]);
  });

  it('falls back to 00:00 when scheduled is missing', () => {
    const [f] = mapFinishedFixtures([raw({ scheduled: '' })]);
    expect(f.ko_utc).toBe('2026-06-30T00:00:00Z');
  });
});
