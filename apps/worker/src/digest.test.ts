import { describe, expect, it, vi } from 'vitest';
import {
  buildCalibrationLine,
  buildWeeklyDigest,
  digestDue,
  digestOnce,
  ledgerWeekNumber,
  weeklyPassCount,
  weeklyPicks,
  type DigestDeps,
} from './digest';
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
    status: 'won',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: 3,
    away_score: 0,
    raw_outcome: 'win',
    units_pl: 1.05,
    settled_at: '2026-06-11T21:00:00.000Z',
    author: 'curator',
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

describe('weeklyPassCount', () => {
  it('counts no-play slugs dated within 7 days only', () => {
    const slugs = new Set([
      'no-play-spain-japan-2026-06-12', // in window
      'no-play-france-peru-2026-06-01', // too old
      'no-play-undated-slug', // no trailing date
    ]);
    expect(weeklyPassCount(slugs, NOW)).toBe(1);
  });
});

describe('ledgerWeekNumber', () => {
  it('counts weeks since the first settled pick', () => {
    expect(ledgerWeekNumber([settledPick({ settled_at: '2026-06-11T21:00:00.000Z' })], NOW)).toBe(1);
    expect(ledgerWeekNumber([settledPick({ settled_at: '2026-05-30T21:00:00.000Z' })], NOW)).toBe(3);
    expect(ledgerWeekNumber([], NOW)).toBe(1);
  });
});

describe('buildCalibrationLine', () => {
  it('reports all-time W-L per confidence level, skipping empty levels', () => {
    const line = buildCalibrationLine([
      settledPick({ id: 'a', confidence: 'high', status: 'won' }),
      settledPick({ id: 'b', confidence: 'high', status: 'won' }),
      settledPick({ id: 'c', confidence: 'medium', status: 'lost' }),
    ]);
    expect(line).toBe('Calibration: MED 0-1, HIGH 2-0');
  });

  it('returns null when no pick has a confidence level', () => {
    expect(buildCalibrationLine([settledPick({ confidence: null })])).toBeNull();
  });
});

describe('buildWeeklyDigest', () => {
  it('returns null when nothing settled and no passes this week', () => {
    expect(buildWeeklyDigest([], 0, 'https://x.test', NOW)).toBeNull();
    expect(
      buildWeeklyDigest([settledPick({ settled_at: '2026-06-01T00:00:00.000Z' })], 0, 'https://x.test', NOW),
    ).toBeNull();
  });

  it('still posts on a pass-only week', () => {
    const text = buildWeeklyDigest([], 1, 'https://x.test', NOW);
    expect(text).toContain('Picks: 0 (0W 0L 0P) \u00b7 Passes: 1 \u2014 discipline first');
  });

  it('builds the 4-line ledger card with record, passes and stats link', () => {
    const text = buildWeeklyDigest(
      [
        settledPick({ id: 'a', status: 'won', units_pl: 1.05 }),
        settledPick({ id: 'b', status: 'lost', units_pl: -1, selection: 'Over 2.5' }),
        settledPick({ id: 'c', status: 'push', units_pl: 0 }),
      ],
      2,
      'https://www.wildlyplay.com',
      NOW,
    );
    expect(text).toContain('\u{1F4CA} Week 1 \u2014 Record 1-1-1 \u00b7 +0.05u');
    expect(text).toContain('Picks: 3 (1W 1L 1P) \u00b7 Passes: 2 \u2014 discipline first');
    expect(text).toContain('https://www.wildlyplay.com/stats');
    expect(text).toContain('Not financial advice');
    expect(text).not.toContain('Calibration'); // no confidence recorded
  });

  it('adds the calibration line when confidence data exists', () => {
    const text = buildWeeklyDigest(
      [settledPick({ confidence: 'low', status: 'won' })],
      0,
      'https://x.test',
      NOW,
    );
    expect(text).toContain('Calibration: LOW 1-0');
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
    return {
      sendMessage: vi.fn(async () => ({ message_id: 7 })),
      sendPhoto: vi.fn(async () => ({ message_id: 8 })),
    };
  }

  function deps(store: MemoryStore, api: ReturnType<typeof fakeApi>): DigestDeps {
    return {
      api: api as unknown as DigestDeps['api'],
      store,
      channelChatId: '-100123',
      siteUrl: 'https://www.wildlyplay.com',
    };
  }

  it('sends the recap banner with the ledger caption when due', async () => {
    const store = new MemoryStore();
    await store.insertPick(settledPick());
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), null, NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendPhoto).toHaveBeenCalledOnce();
    expect(api.sendPhoto).toHaveBeenCalledWith(
      '-100123',
      'https://www.wildlyplay.com/images/wildlyplay_recap.png',
      { caption: expect.stringContaining('Week 1') },
    );
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('falls back to text when the banner fails', async () => {
    const store = new MemoryStore();
    await store.insertPick(settledPick());
    const api = fakeApi();
    api.sendPhoto.mockRejectedValueOnce(new Error('boom'));
    const key = await digestOnce(deps(store, api), null, NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendMessage).toHaveBeenCalledWith('-100123', expect.stringContaining('Week 1'));
  });

  it('does nothing when not due', async () => {
    const store = new MemoryStore();
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), '2026-06-14', NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendPhoto).not.toHaveBeenCalled();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('marks the week done even when nothing settled (no retry spam)', async () => {
    const store = new MemoryStore();
    const api = fakeApi();
    const key = await digestOnce(deps(store, api), null, NOW);
    expect(key).toBe('2026-06-14');
    expect(api.sendPhoto).not.toHaveBeenCalled();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });
});
