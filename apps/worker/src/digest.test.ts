import { describe, expect, it, vi } from 'vitest';
import { buildWeeklyDigest, digestDue, digestOnce, weeklyPicks, type DigestDeps } from './digest';
import { MemoryStore, type PickRow } from './store';

const NOW = new Date('2026-06-14T13:30:00.000Z'); // a Sunday, 13:xx UTC

function settledPick(overrides: Partial<PickRow> = {}): PickRow {
  return {
    id: 'pick-1',
    fixture_id: 0,
    league: 'FIFA World Cup 2026 — Group A',
    kickoff_utc: '2026-06-11T19:00:00.000Z',
    home_team: 'Mexico',
    away_team: 'South Africa',
    market: 'ah',
    selection: 'Mexico -1.25',
    line: -1.25,
    odds_publish: 2.05,
    odds_close: null,
    publish_score_home: null,
    publish_score_away: null,
    home_id: null,
    away_id: null,
    stake_units: 1,
    thesis: 'Mexico dominant at home',
    status: 'won',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: 3,
    away_score: 0,
    raw_outcome: 'win',
    units_pl: 1.05,
    settled_at: '2026-06-11T21:00:00.000Z',
    ...overrides,
  };
}

describe('weeklyPicks', () => {
  it('keeps picks settled within 7 days and drops older or unsettled ones', () => {
    const week = weeklyPicks(
      [
        settledPick({ id: 'in', settled_at: '2026-06-10T00:00:00.000Z' }),
        settledPick({ id: 'old', settled_at: '2026-06-01T00:00:00.000Z' }),
        settledPick({ id: 'unsettled', settled_at: null }),
      ],
      NOW,
    );
    expect(week.map((p) => p.id)).toEqual(['in']);
  });
});

describe('buildWeeklyDigest', () => {
  it('returns null when nothing settled this week', () => {
    expect(buildWeeklyDigest([], 'https://x.test', NOW)).toBeNull();
    expect(
      buildWeeklyDigest([settledPick({ settled_at: '2026-06-01T00:00:00.000Z' })], 'https://x.test', NOW),
    ).toBeNull();
  });

  it('includes record, units, best play and stats link', () => {
    const text = buildWeeklyDigest(
      [
        settledPick({ id: 'a', status: 'won', units_pl: 1.05 }),
        settledPick({
          id: 'b',
          status: 'lost',
          units_pl: -1,
          selection: 'Over 2.5',
          home_team: 'Spain',
          away_team: 'Japan',
        }),
        settledPick({ id: 'c', status: 'push', units_pl: 0 }),
      ],
      'https://www.wildlyplay.com',
      NOW,
    );
    expect(text).toContain('1-1-1 (W-L-P), +0.05 units');
    expect(text).toContain('Best play: Mexico -1.25 @ 2.05 (+1.05u) — Mexico 3-0 South Africa');
    expect(text).toContain('https://www.wildlyplay.com/stats');
    expect(text).not.toContain('Avg CLV'); // no closing odds captured
  });

  it('adds avg CLV only over picks with closing odds', () => {
    const text = buildWeeklyDigest(
      [
        settledPick({ id: 'a', odds_publish: 2.1, odds_close: 2.0 }), // +5%
        settledPick({ id: 'b', odds_close: null }),
      ],
      'https://x.test',
      NOW,
    );
    expect(text).toContain('Avg CLV: +5%');
  });
});

describe('digestDue', () => {
  it('fires on Sunday 13:xx UTC with the date as key', () => {
    expect(digestDue(NOW, null)).toBe('2026-06-14');
  });

  it('dedupes on the same key and stays quiet outside the window', () => {
    expect(digestDue(NOW, '2026-06-14')).toBeNull();
    expect(digestDue(new Date('2026-06-14T14:30:00.000Z'), null)).toBeNull(); // wrong hour
    expect(digestDue(new Date('2026-06-15T13:30:00.000Z'), null)).toBeNull(); // Monday
  });
});

describe('digestOnce', () => {
  function fakeApi() {
    return { sendMessage: vi.fn(async () => ({ message_id: 7 })) };
  }

  function deps(store: MemoryStore, api: ReturnType<typeof fakeApi>): DigestDeps {
    return {
      api: api as unknown as DigestDeps['api'],
      store,
      channelChatId: '-100123',
      siteUrl: 'https://www.wildlyplay.com',
    };
  }

  it('sends to the channel when due and returns the new key', async () => {
    const store = new MemoryStore();
    await store.insertPick(settledPick());
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), null, NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendMessage).toHaveBeenCalledOnce();
    expect(api.sendMessage).toHaveBeenCalledWith('-100123', expect.stringContaining('weekly digest'));
  });

  it('does nothing when not due', async () => {
    const store = new MemoryStore();
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), '2026-06-14', NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('marks the week done even when nothing settled (no retry spam)', async () => {
    const store = new MemoryStore();
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), null, NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });
});
