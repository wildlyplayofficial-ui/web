import { describe, expect, it } from 'vitest';
import { parseNoPlay } from './parse-noplay';

const VALID = `/noplay
match: Spain vs Saudi Arabia
league: FIFA World Cup 2026 — Group H
reason: NO_EDGE
note: Full-strength favorite, nothing worth backing at this price`;

describe('parseNoPlay — happy path', () => {
  it('parses the full example', () => {
    const r = parseNoPlay(VALID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.noplay).toEqual({
      homeTeam: 'Spain',
      awayTeam: 'Saudi Arabia',
      league: 'FIFA World Cup 2026 — Group H',
      reason: 'NO_EDGE',
      watching: null,
      verdict: null,
      note: 'Full-strength favorite, nothing worth backing at this price',
      author: 'curator',
    });
  });
});

describe('parseNoPlay — verdict (TG card short line, R5: never auto-truncate)', () => {
  it('parses an explicit verdict field, separate from the long-form note', () => {
    const r = parseNoPlay(VALID.replace('note:', 'verdict: No position — two-pole variance\nnote:'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.noplay.verdict).toBe('No position — two-pole variance');
    expect(r.noplay.note).toBe('Full-strength favorite, nothing worth backing at this price');
  });

  it('defaults verdict to null when omitted', () => {
    const r = parseNoPlay(VALID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.noplay.verdict).toBeNull();
  });

  it('rejects verdict: placed after note instead of silently swallowing it into the free text', () => {
    const r = parseNoPlay(`${VALID}\nverdict: too late`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('field "verdict" found after note');
  });
});

describe('parseNoPlay — errors', () => {
  it('requires match field', () => {
    const r = parseNoPlay('/noplay\nreason: NO_EDGE');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('missing field: match');
  });

  it('requires reason field', () => {
    const r = parseNoPlay('/noplay\nmatch: A vs B');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('missing field: reason');
  });

  it('rejects an invalid reason', () => {
    const r = parseNoPlay('/noplay\nmatch: A vs B\nreason: BAD_VIBES');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('reason must be one of');
  });
});

describe('parseNoPlay — author (Tiered Picks §12)', () => {
  it('defaults to curator when author is omitted', () => {
    const r = parseNoPlay(VALID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.noplay.author).toBe('curator');
  });

  it('accepts author: scout', () => {
    const r = parseNoPlay(VALID.replace('note:', 'author: scout\nnote:'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.noplay.author).toBe('scout');
  });

  it('rejects an invalid author value', () => {
    const r = parseNoPlay(VALID.replace('note:', 'author: robot\nnote:'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('author must be curator/scout');
  });

  it('rejects author: placed after note instead of silently swallowing it into the free text', () => {
    const r = parseNoPlay(`${VALID}\nauthor: scout`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('field "author" found after note');
  });
});
