import { describe, expect, it } from 'vitest';
import { parseWatching } from './parse-watching';

const NOW = new Date('2026-06-01T00:00:00Z');

const VALID = `/watching
match: Germany vs Japan
league: FIFA World Cup 2026 — Group E
kickoff: 2026-06-15T18:00Z
note: Yamal out, Germany resting Musiala`;

describe('parseWatching — happy path', () => {
  it('parses the full example', () => {
    const r = parseWatching(VALID, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.watching).toEqual({
      homeTeam: 'Germany',
      awayTeam: 'Japan',
      league: 'FIFA World Cup 2026 — Group E',
      kickoffUtc: '2026-06-15T18:00:00.000Z',
      note: 'Yamal out, Germany resting Musiala',
      reason: null,
    });
  });

  it('defaults league to FIFA World Cup 2026 when omitted', () => {
    const text = `/watching
match: Brazil vs Argentina
kickoff: 2026-06-20T20:00Z`;
    const r = parseWatching(text, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.watching.league).toBe('FIFA World Cup 2026');
    expect(r.watching.note).toBeNull();
  });

  it('captures a multi-line note', () => {
    const text = `${VALID}\nSecond line of note.`;
    const r = parseWatching(text, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.watching.note).toBe('Yamal out, Germany resting Musiala\nSecond line of note.');
  });
});

describe('parseWatching — errors', () => {
  it('requires match field', () => {
    const r = parseWatching('/watching\nkickoff: 2026-06-15T18:00Z', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('missing field: match');
  });

  it('requires kickoff field', () => {
    const r = parseWatching('/watching\nmatch: A vs B', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('missing field: kickoff');
  });

  it('rejects match without vs', () => {
    const r = parseWatching('/watching\nmatch: Germany\nkickoff: 2026-06-15T18:00Z', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('match must be');
  });

  it('rejects kickoff in the past', () => {
    const r = parseWatching('/watching\nmatch: A vs B\nkickoff: 2026-05-01T18:00Z', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('kickoff must be in the future');
  });

  it('rejects unknown fields', () => {
    const r = parseWatching('/watching\nmatch: A vs B\nkickoff: 2026-06-15T18:00Z\nodds: 1.9', NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('unknown field: "odds"');
  });
});
