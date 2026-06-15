import { afterEach, describe, expect, it, vi } from 'vitest';
import { findEventId, matchEvent, type ApiEvent } from './event-lookup';

const EVENTS: ApiEvent[] = [
  { id: 101, home: 'Canada', away: 'Bosnia and Herzegovina', date: '2026-06-12T19:00:00Z' },
  { id: 102, home: 'Mexico', away: 'South Korea', date: '2026-06-12T22:00:00Z' },
  { id: 103, home: 'Canada', away: 'Bosnia and Herzegovina', date: '2026-06-20T19:00:00Z' },
];

const query = (homeTeam: string, awayTeam: string, kickoffUtc: string) =>
  ({ homeTeam, awayTeam, kickoffUtc });

describe('matchEvent', () => {
  it('matches exactly one event on teams + UTC date', () => {
    expect(matchEvent(EVENTS, query('Canada', 'Bosnia and Herzegovina', '2026-06-12T19:00:00.000Z'))).toBe(101);
  });

  it('normalizes "&" to "and" ("Bosnia & Herzegovina" ↔ "Bosnia and Herzegovina")', () => {
    expect(matchEvent(EVENTS, query('Canada', 'Bosnia & Herzegovina', '2026-06-12T19:00:00.000Z'))).toBe(101);
  });

  it('short name contained in the API name still matches ("Bosnia")', () => {
    expect(matchEvent(EVENTS, query('Canada', 'Bosnia', '2026-06-12T19:00:00.000Z'))).toBe(101);
  });

  it('strips diacritics ("México" ↔ "Mexico")', () => {
    expect(matchEvent(EVENTS, query('México', 'South Korea', '2026-06-12T22:00:00.000Z'))).toBe(102);
  });

  it('same UTC date but different hour still matches (Curator typed kickoff off)', () => {
    expect(matchEvent(EVENTS, query('Canada', 'Bosnia', '2026-06-12T21:30:00.000Z'))).toBe(101);
  });

  it('zero matches → null (unknown teams, wrong date)', () => {
    expect(matchEvent(EVENTS, query('France', 'Brazil', '2026-06-12T19:00:00.000Z'))).toBeNull();
    expect(matchEvent(EVENTS, query('Canada', 'Bosnia', '2026-06-13T19:00:00.000Z'))).toBeNull();
  });

  it('swapped home/away still matches (Nick 13/6: betting sites differ from odds-api)', () => {
    expect(matchEvent(EVENTS, query('Bosnia', 'Canada', '2026-06-12T19:00:00.000Z'))).not.toBeNull();
  });

  it('two candidates on the same date → null (ambiguous, no guessing)', () => {
    const events: ApiEvent[] = [
      { id: 201, home: 'South Korea', away: 'Japan', date: '2026-06-15T16:00:00Z' },
      { id: 202, home: 'North Korea', away: 'Japan', date: '2026-06-15T19:00:00Z' },
    ];
    expect(matchEvent(events, query('Korea', 'Japan', '2026-06-15T16:00:00.000Z'))).toBeNull();
  });
});

describe('findEventId', () => {
  const PICK = query('Canada', 'Bosnia & Herzegovina', '2026-06-12T19:00:00.000Z');

  afterEach(() => vi.unstubAllGlobals());

  it('fetches the league events and returns the unique match', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(EVENTS)));
    vi.stubGlobal('fetch', fetchMock);

    expect(await findEventId({ apiKey: 'k' }, PICK)).toBe(101);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('league=international-fifa-world-cup');
    expect(url).toContain('apiKey=k');
  });

  it('no unambiguous match → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(EVENTS))));
    expect(await findEventId({ apiKey: 'k' }, query('France', 'Brazil', '2026-06-12T19:00:00.000Z'))).toBeNull();
  });

  it('HTTP error → null (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(findEventId({ apiKey: 'k' }, PICK)).resolves.toBeNull();
  });

  it('fetch rejection → null (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(findEventId({ apiKey: 'k' }, PICK)).resolves.toBeNull();
  });

  it('unexpected payload shape (not an array) → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'rate limit' }))));
    await expect(findEventId({ apiKey: 'k' }, PICK)).resolves.toBeNull();
  });
});
