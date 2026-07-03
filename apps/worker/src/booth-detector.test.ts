import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectNewEvents } from './booth-detector';

/** Build a livescore events payload. */
function payload(events: any[], match: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      match: { home_name: 'Switzerland', away_name: 'Algeria', score: '2 - 0', ...match },
      event: events,
    },
  };
}

function mockFetch(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })));
}

afterEach(() => vi.unstubAllGlobals());

describe('detectNewEvents — stable ids (bug 3/7: livescore ids rotate between polls)', () => {
  const goal1 = { event: 'GOAL', time: '10', player: 'Embolo', home_away: 'h' };
  const goal2 = { event: 'GOAL', time: '46', player: 'Vargas', home_away: 'h' };

  it('same events with ROTATED api ids are not re-detected once seen', async () => {
    const seen = new Set<string>();

    mockFetch(payload([{ ...goal1, id: 111 }, { ...goal2, id: 222 }]));
    const first = await detectNewEvents('https://x/events?id=717540', seen);
    expect(first.map((e) => e.id)).toEqual(['goal:1-0', 'goal:2-0']);
    for (const e of first) seen.add(e.id);

    // Next poll: api returns NEW ids for the SAME events
    mockFetch(payload([{ ...goal1, id: 999 }, { ...goal2, id: 888 }]));
    const second = await detectNewEvents('https://x/events?id=717540', seen);
    expect(second).toEqual([]);
  });

  it('goal id survives minute drift (10\' reported as 11\' later)', async () => {
    const seen = new Set<string>(['goal:1-0']);
    mockFetch(payload([{ ...goal1, time: '11', id: 555 }]));
    const events = await detectNewEvents('https://x/events?id=717540', seen);
    expect(events).toEqual([]);
  });

  it('a genuinely new goal is still detected (2nd goal after 1st is seen)', async () => {
    const seen = new Set<string>(['goal:1-0']);
    mockFetch(payload([{ ...goal1, id: 111 }, { ...goal2, id: 222 }]));
    const events = await detectNewEvents('https://x/events?id=717540', seen);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('goal:2-0');
    expect(events[0].minute).toBe('46');
    expect(events[0].scoreAtEvent).toEqual({ home: 2, away: 0 });
  });

  it('red cards keyed by player, not rotating api id', async () => {
    const seen = new Set<string>();
    mockFetch(payload([{ event: 'RED_CARD', time: '60', player: 'Zakaria', home_away: 'a', id: 42 }]));
    const first = await detectNewEvents('https://x/events?id=717540', seen);
    expect(first.map((e) => e.id)).toEqual(['red_card:Zakaria']);
    for (const e of first) seen.add(e.id);

    mockFetch(payload([{ event: 'RED_CARD', time: '61', player: 'Zakaria', home_away: 'a', id: 77 }]));
    expect(await detectNewEvents('https://x/events?id=717540', seen)).toEqual([]);
  });
});
