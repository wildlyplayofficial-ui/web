import { describe, expect, it } from 'vitest';
import { parsePick } from './parse-pick';

const NOW = new Date('2026-06-01T00:00:00Z');

const VALID = `/pick
match: Mexico vs South Africa
league: FIFA World Cup 2026 — Group A
kickoff: 2026-06-11T19:00Z
market: ah
selection: Mexico -1.25
line: -1.25
odds: 2.05
stake: 1
thesis: Mexico dominant at home, SA missing two starters.`;

function expectErrors(text: string, ...fragments: string[]) {
  const r = parsePick(text, NOW);
  expect(r.ok).toBe(false);
  if (r.ok) return;
  for (const f of fragments) {
    expect(r.errors.join('\n')).toContain(f);
  }
}

describe('parsePick — happy path', () => {
  it('parses the full example message', () => {
    const r = parsePick(VALID, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick).toEqual({
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      league: 'FIFA World Cup 2026 — Group A',
      kickoffUtc: '2026-06-11T19:00:00.000Z',
      market: 'ah',
      selection: 'Mexico -1.25',
      line: -1.25,
      odds: 2.05,
      stake: 1,
      thesis: 'Mexico dominant at home, SA missing two starters.',
      eventId: null,
      publishScoreHome: null,
      publishScoreAway: null,
    });
  });

  it('captures a multi-line thesis', () => {
    const r = parsePick(`${VALID}\nSecond line of reasoning.\nThird line.`, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick.thesis).toBe(
      'Mexico dominant at home, SA missing two starters.\nSecond line of reasoning.\nThird line.',
    );
  });

  it('parses the optional event field', () => {
    const r = parsePick(VALID.replace('thesis:', 'event: 66456904\nthesis:'), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick.eventId).toBe(66456904);
  });

  it('accepts 1x2 without a line', () => {
    const text = `/pick
match: A vs B
league: L
kickoff: 2026-06-11T19:00Z
market: 1x2
selection: draw
odds: 3.2
stake: 0.5
thesis: t`;
    const r = parsePick(text, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick.line).toBeNull();
    expect(r.pick.market).toBe('1x2');
  });
});

describe('parsePick — missing fields', () => {
  const drop = (field: string) =>
    VALID.split('\n').filter((l) => !l.startsWith(`${field}:`)).join('\n');

  it.each(['match', 'league', 'kickoff', 'market', 'selection', 'odds', 'stake', 'thesis'])(
    'reports missing %s',
    (field) => expectErrors(drop(field), field),
  );

  it('reports every problem at once', () => {
    const r = parsePick('/pick\nmatch: A vs B', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.length).toBeGreaterThanOrEqual(6);
  });
});

describe('parsePick — invalid fields', () => {
  const swap = (from: string, to: string) => VALID.replace(from, to);

  it('rejects match without "vs"', () =>
    expectErrors(swap('match: Mexico vs South Africa', 'match: Mexico'), 'match must be'));
  it('rejects an unknown market', () =>
    expectErrors(swap('market: ah', 'market: corners'), 'market must be one of ah/ou/1x2/btts/other'));
  it('requires line for ah', () =>
    expectErrors(swap('line: -1.25', 'line:'), 'line is required for market "ah"'));
  it('requires line for ou', () =>
    expectErrors(
      swap('market: ah', 'market: ou').replace('line: -1.25', 'line:'),
      'line is required for market "ou"',
    ));
  it('forbids line for btts', () =>
    expectErrors(swap('market: ah', 'market: btts'), 'line must be omitted for market "btts"'));
  it('forbids line for 1x2', () =>
    expectErrors(swap('market: ah', 'market: 1x2'), 'line must be omitted for market "1x2"'));
  it('rejects non-numeric line', () =>
    expectErrors(swap('line: -1.25', 'line: abc'), 'line is not a number'));
  it('rejects odds below 1.01', () => expectErrors(swap('odds: 2.05', 'odds: 1.0'), 'odds must be between'));
  it('rejects odds above 100', () => expectErrors(swap('odds: 2.05', 'odds: 101'), 'odds must be between'));
  it('rejects stake above 5', () => expectErrors(swap('stake: 1', 'stake: 5.25'), 'stake must be between'));
  it('rejects stake below 0.25', () => expectErrors(swap('stake: 1', 'stake: 0.1'), 'stake must be between'));
  it('rejects stake off the 0.25 grid', () =>
    expectErrors(swap('stake: 1', 'stake: 1.1'), 'stake must be in 0.25 steps'));
  it('accepts stake on the 0.25 grid', () => {
    const r = parsePick(swap('stake: 1', 'stake: 2.75'), NOW);
    expect(r.ok).toBe(true);
  });
  it('rejects unparseable kickoff', () =>
    expectErrors(swap('kickoff: 2026-06-11T19:00Z', 'kickoff: tomorrow evening'), 'not a valid ISO datetime'));
  it('rejects kickoff in the past', () =>
    expectErrors(swap('kickoff: 2026-06-11T19:00Z', 'kickoff: 2026-05-01T19:00Z'), 'kickoff must be in the future'));
  it('rejects a non-numeric event id', () =>
    expectErrors(swap('thesis:', 'event: abc\nthesis:'), 'event must be a numeric'));
  it('rejects unknown fields', () => expectErrors(`${VALID}`.replace('league:', 'leage:'), 'unknown field: "leage"'));
});

describe('parsePick — running picks (score field)', () => {
  const withScore = (score: string) => VALID.replace('thesis:', `score: ${score}\nthesis:`);

  it('parses score: 1-0 into publishScoreHome/Away', () => {
    const r = parsePick(withScore('1-0'), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick.publishScoreHome).toBe(1);
    expect(r.pick.publishScoreAway).toBe(0);
  });

  it.each(['1:0', '1-', 'a-b', '1 - 0'])('rejects malformed score "%s"', (s) =>
    expectErrors(withScore(s), 'score must be'));

  it('allows kickoff in the past when score is present (live pick)', () => {
    const r = parsePick(
      withScore('1-0').replace('kickoff: 2026-06-11T19:00Z', 'kickoff: 2026-05-01T19:00Z'),
      NOW,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pick.kickoffUtc).toBe('2026-05-01T19:00:00.000Z');
  });

  it('still rejects an unparseable kickoff on a running pick', () =>
    expectErrors(
      withScore('1-0').replace('kickoff: 2026-06-11T19:00Z', 'kickoff: yesterday'),
      'not a valid ISO datetime',
    ));
});
