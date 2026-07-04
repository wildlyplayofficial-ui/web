import { describe, expect, it } from 'vitest';
import { mapUpcomingFixtures } from './upcoming-fixtures';

const raw = (overrides: Partial<{ home: string; away: string; date: string; time: string }> = {}) => {
  const o = { home: 'Brazil', away: 'Norway', date: '2026-07-05', time: '20:00:00', ...overrides };
  return { home_name: o.home, away_name: o.away, date: o.date, time: o.time };
};

describe('mapUpcomingFixtures — R0 Triage shadow-read companion (Nick 4/7, item ②)', () => {
  it('maps a scheduled fixture to home/away/ko_utc, no score or status', () => {
    const [f] = mapUpcomingFixtures([raw()]);
    expect(f).toEqual({ home: 'Brazil', away: 'Norway', ko_utc: '2026-07-05T20:00:00Z' });
  });

  it('falls back to 00:00 when time is missing', () => {
    const [f] = mapUpcomingFixtures([raw({ time: '' })]);
    expect(f.ko_utc).toBe('2026-07-05T00:00:00Z');
  });
});
