import { describe, expect, it } from 'vitest';
import { settlePick } from './settle';
import { MemoryStore, type NewPick } from './store';

function basePick(overrides: Partial<NewPick> = {}): NewPick {
  return {
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
    thesis: 'test thesis',
    status: 'published',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    ...overrides,
  };
}

describe('settlePick — publish → score → settled (memory store)', () => {
  it('settles the AH +0.25 half-win case: 0-0, odds 1.96, stake 1 → +0.48u, status won', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({
      selection: 'Mexico +0.25', line: 0.25, odds_publish: 1.96, stake_units: 1,
    }));

    const settled = await settlePick(store, pick, { home: 0, away: 0 }, new Date('2026-06-11T21:00:00Z'));

    expect(settled.raw_outcome).toBe('half_win');
    expect(settled.status).toBe('won'); // display rule: half-win badge = WON (decision #2)
    expect(settled.units_pl).toBe(0.48); // real math shown alongside
    expect(settled.home_score).toBe(0);
    expect(settled.away_score).toBe(0);
    expect(settled.settled_at).toBe('2026-06-11T21:00:00.000Z');
    // persisted, not just returned
    expect(await store.getPick(pick.id)).toEqual(settled);
  });

  it('settles a full AH win with real units', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick());
    const settled = await settlePick(store, pick, { home: 3, away: 0 });
    expect(settled.raw_outcome).toBe('win');
    expect(settled.status).toBe('won');
    expect(settled.units_pl).toBe(1.05);
  });

  it('settles an AH half-loss as LOST with -0.5 stake', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick());
    const settled = await settlePick(store, pick, { home: 1, away: 0 }); // margin 1 vs -1.25
    expect(settled.raw_outcome).toBe('half_loss');
    expect(settled.status).toBe('lost');
    expect(settled.units_pl).toBe(-0.5);
  });

  it('settles over/under from the selection text', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ market: 'ou', selection: 'Over 2.5', line: 2.5 }));
    const settled = await settlePick(store, pick, { home: 2, away: 1 });
    expect(settled.raw_outcome).toBe('win');
    expect(settled.status).toBe('won');
  });

  it('settles a 1x2 away pick by team name', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ market: '1x2', selection: 'South Africa', line: null }));
    const settled = await settlePick(store, pick, { home: 0, away: 1 });
    expect(settled.status).toBe('won');
    expect(settled.units_pl).toBe(1.05);
  });

  it('settles btts yes losing on 1-0', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ market: 'btts', selection: 'yes', line: null }));
    const settled = await settlePick(store, pick, { home: 1, away: 0 });
    expect(settled.raw_outcome).toBe('loss');
    expect(settled.status).toBe('lost');
    expect(settled.units_pl).toBe(-1);
  });

  it('refuses to settle a pick that is not published', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ status: 'won' }));
    await expect(settlePick(store, pick, { home: 1, away: 0 })).rejects.toThrow(/not settleable/);
  });

  it('refuses market "other" (no automatic math)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ market: 'other', selection: 'Mexico to win a corner', line: null }));
    await expect(settlePick(store, pick, { home: 1, away: 0 })).rejects.toThrow(/no automatic settlement/);
  });

  it('throws when an AH selection matches neither team', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({ selection: 'Brazil -1.25' }));
    await expect(settlePick(store, pick, { home: 1, away: 0 })).rejects.toThrow(/matches neither/);
  });
});

describe('settlePick — running picks (handicap on goals after entry)', () => {
  it('AH offsets by the publish score: entry 1-0, Mexico -0.5, final 2-1 → adjusted 1-1 → loss', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({
      selection: 'Mexico -0.5', line: -0.5, publish_score_home: 1, publish_score_away: 0,
    }));
    const settled = await settlePick(store, pick, { home: 2, away: 1 });
    expect(settled.raw_outcome).toBe('loss');
    expect(settled.status).toBe('lost');
    expect(settled.units_pl).toBe(-1);
    // the FULL final score is persisted, not the adjusted one
    expect(settled.home_score).toBe(2);
    expect(settled.away_score).toBe(1);
  });

  it('AH win after entry: entry 0-1, Mexico -0.5, final 2-1 → adjusted 2-0 → win', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({
      selection: 'Mexico -0.5', line: -0.5, publish_score_home: 0, publish_score_away: 1,
    }));
    const settled = await settlePick(store, pick, { home: 2, away: 1 });
    expect(settled.raw_outcome).toBe('win');
    expect(settled.status).toBe('won');
  });

  it('OU is NOT offset: entry 1-0, Over 2.5, final 2-1 → 3 goals full-match → win', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({
      market: 'ou', selection: 'Over 2.5', line: 2.5, publish_score_home: 1, publish_score_away: 0,
    }));
    const settled = await settlePick(store, pick, { home: 2, away: 1 });
    expect(settled.raw_outcome).toBe('win'); // adjusted score 1-1 would have lost
  });

  it('1x2 is NOT offset: entry 1-0, draw pick, final 2-1 → full-time loss', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(basePick({
      market: '1x2', selection: 'draw', line: null, publish_score_home: 1, publish_score_away: 0,
    }));
    const settled = await settlePick(store, pick, { home: 2, away: 1 });
    expect(settled.raw_outcome).toBe('loss'); // adjusted 1-1 would have been a draw win
  });
});
