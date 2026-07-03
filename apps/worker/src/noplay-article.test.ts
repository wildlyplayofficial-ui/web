import { describe, expect, it } from 'vitest';
import { buildNoPlayPrompt } from './noplay-article';
import { disclosureFor } from './recap';
import type { ParsedNoPlay } from './parse-noplay';

function noplay(overrides: Partial<ParsedNoPlay> = {}): ParsedNoPlay {
  return {
    homeTeam: 'Mexico',
    awayTeam: 'South Africa',
    league: 'FIFA World Cup 2026 — Group A',
    reason: 'NO_EDGE',
    watching: null,
    note: null,
    author: 'curator',
    ...overrides,
  };
}

describe('buildNoPlayPrompt — disclosure (Tiered Picks §12 firewall)', () => {
  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the curator (real_human) disclosure in %s',
    (lang) => {
      const prompt = buildNoPlayPrompt(noplay({ author: 'curator' }));
      expect(prompt).toContain(disclosureFor('real_human', lang));
    },
  );

  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the scout (fictional_ai) disclosure in %s',
    (lang) => {
      const prompt = buildNoPlayPrompt(noplay({ author: 'scout' }));
      expect(prompt).toContain(disclosureFor('fictional_ai', lang));
    },
  );

  it('never leaks the curator wording into a scout no-play prompt', () => {
    const prompt = buildNoPlayPrompt(noplay({ author: 'scout' }));
    expect(prompt).not.toContain(disclosureFor('real_human', 'en'));
  });
});
