import { describe, expect, it, vi } from 'vitest';
import { captureClosingOdds, extractClosingOdds, type OddsPayload } from './clv';
import { MemoryStore, type NewPick, type PickRow } from './store';

function publishedPick(overrides: Partial<NewPick> = {}): NewPick {
  return {
    fixture_id: 66456916,
    league: 'FIFA World Cup',
    kickoff_utc: '2026-06-12T19:00:00.000Z',
    home_team: 'Canada',
    away_team: 'Bosnia',
    market: 'ah',
    selection: 'Canada -0.5',
    line: -0.5,
    odds_publish: 1.9,
    odds_close: null,
    publish_score_home: null,
    publish_score_away: null,
    home_id: null,
    away_id: null,
    stake_units: 1,
    thesis: 'test',
    status: 'published',
    published_at: '2026-06-11T00:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    confidence: null,
    primary_edge: null,
    consensus_edge_pct: null,
    supporting_evidence: null,
    loss_type: null,
    postmortem_status: null,
    postmortem_draft: null,
    postmortem_approved: null,
    postmortem_at: null,
    market_side: null,
    favored_dog: null,
    author: 'curator',
    ...overrides,
  };
}

// Mirrors the real odds-api.io /v3/odds shape (string odds values).
const PAYLOAD: OddsPayload = {
  bookmakers: {
    Bet365: [
      { name: 'ML', updatedAt: '', odds: [{ home: '1.850', draw: '3.500', away: '4.500' }] },
      {
        name: 'Spread', updatedAt: '',
        odds: [
          { hdp: -0.5, home: '1.850', away: '2.000' },
          { hdp: -1, home: '2.450', away: '1.550' },
        ],
      },
      { name: 'Totals', updatedAt: '', odds: [{ hdp: 2.25, over: '1.950', under: '1.900' }] },
      { name: 'Goals Over/Under', updatedAt: '', odds: [{ hdp: 2.5, over: '2.200', under: '1.666' }] },
    ] as never,
  },
};

const asRow = (p: NewPick): PickRow => ({ id: 'x', ...p });

describe('extractClosingOdds', () => {
  it('ah home side: matches hdp = line, returns home odds', () => {
    expect(extractClosingOdds(asRow(publishedPick()), PAYLOAD)).toBe(1.85);
  });

  it('ah away side: matches hdp = -line, returns away odds', () => {
    const pick = publishedPick({ selection: 'Bosnia +1', line: 1 });
    expect(extractClosingOdds(asRow(pick), PAYLOAD)).toBe(1.55);
  });

  it('ah: line no longer offered → null (no approximation)', () => {
    const pick = publishedPick({ selection: 'Canada -1.25', line: -1.25 });
    expect(extractClosingOdds(asRow(pick), PAYLOAD)).toBeNull();
  });

  it('ou over: finds the line across Totals/Goals markets', () => {
    const pick = publishedPick({ market: 'ou', selection: 'Over 2.5', line: 2.5 });
    expect(extractClosingOdds(asRow(pick), PAYLOAD)).toBe(2.2);
  });

  it('ou under on the Totals line', () => {
    const pick = publishedPick({ market: 'ou', selection: 'Under 2.25', line: 2.25 });
    expect(extractClosingOdds(asRow(pick), PAYLOAD)).toBe(1.9);
  });

  it('1x2: home / draw / away from ML', () => {
    expect(extractClosingOdds(asRow(publishedPick({ market: '1x2', selection: 'Canada', line: null })), PAYLOAD)).toBe(1.85);
    expect(extractClosingOdds(asRow(publishedPick({ market: '1x2', selection: 'Draw', line: null })), PAYLOAD)).toBe(3.5);
    expect(extractClosingOdds(asRow(publishedPick({ market: '1x2', selection: 'Bosnia', line: null })), PAYLOAD)).toBe(4.5);
  });

  it('btts/other and missing bookmaker → null', () => {
    expect(extractClosingOdds(asRow(publishedPick({ market: 'btts', selection: 'yes', line: null })), PAYLOAD)).toBeNull();
    expect(extractClosingOdds(asRow(publishedPick()), {})).toBeNull();
  });
});

describe('captureClosingOdds', () => {
  const KICKOFF = new Date('2026-06-12T19:00:00.000Z');

  it('captures inside the window and persists odds_close', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const getOdds = vi.fn(async () => PAYLOAD);

    await captureClosingOdds({ store, getOdds }, [pick], new Date(KICKOFF.getTime() - 5 * 60_000));

    expect(getOdds).toHaveBeenCalledWith(66456916);
    expect((await store.getPick(pick.id))!.odds_close).toBe(1.85);
  });

  it('skips picks outside the window, already captured, or without event id', async () => {
    const store = new MemoryStore();
    const early = await store.insertPick(publishedPick());
    const captured = await store.insertPick(publishedPick({ odds_close: 1.8 }));
    const manual = await store.insertPick(publishedPick({ fixture_id: 0 }));
    const getOdds = vi.fn(async () => PAYLOAD);

    // 2 hours before kickoff → outside window for `early`; others skipped by guards.
    await captureClosingOdds({ store, getOdds }, [early, captured, manual],
      new Date(KICKOFF.getTime() - 2 * 3_600_000));

    expect(getOdds).not.toHaveBeenCalled();
  });

  it('fetch failures are swallowed (never blocks the poll)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const getOdds = vi.fn(async () => { throw new Error('api down'); });

    await expect(
      captureClosingOdds({ store, getOdds }, [pick], KICKOFF),
    ).resolves.toBeUndefined();
    expect((await store.getPick(pick.id))!.odds_close).toBeNull();
  });

  it('line gone at close → stays null, no write', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ selection: 'Canada -1.75', line: -1.75 }));
    const getOdds = vi.fn(async () => PAYLOAD);

    await captureClosingOdds({ store, getOdds }, [pick], KICKOFF);

    expect((await store.getPick(pick.id))!.odds_close).toBeNull();
  });
});
