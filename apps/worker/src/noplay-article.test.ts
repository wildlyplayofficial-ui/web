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
    verdict: null,
    note: null,
    author: 'curator',
    ...overrides,
  };
}

describe('buildNoPlayPrompt — disclosure (Tiered Picks §12 firewall)', () => {
  it('renders the curator (real_human) disclosure in vi — and ONLY vi', () => {
    const prompt = buildNoPlayPrompt(noplay({ author: 'curator' }));
    expect(prompt).toContain(disclosureFor('real_human', 'vi'));
    for (const lang of ['en', 'th', 'es'] as const) {
      expect(prompt).not.toContain(disclosureFor('real_human', lang));
    }
  });

  it('renders the scout (fictional_ai) disclosure in vi — and ONLY vi', () => {
    const prompt = buildNoPlayPrompt(noplay({ author: 'scout' }));
    expect(prompt).toContain(disclosureFor('fictional_ai', 'vi'));
    for (const lang of ['en', 'th', 'es'] as const) {
      expect(prompt).not.toContain(disclosureFor('fictional_ai', lang));
    }
  });

  it('never leaks the curator wording into a scout no-play prompt', () => {
    const prompt = buildNoPlayPrompt(noplay({ author: 'scout' }));
    expect(prompt).not.toContain(disclosureFor('real_human', 'en'));
  });
});
