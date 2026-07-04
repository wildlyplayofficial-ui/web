import { describe, expect, it } from 'vitest';
import { buildNoPlayPrompt, formatNoPlayMessage } from './noplay-article';
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

describe('formatNoPlayMessage — TG card verdict line (R5: never auto-truncate the long-form note)', () => {
  it('uses the short verdict field when present', () => {
    const msg = formatNoPlayMessage(
      noplay({ verdict: 'No position — two-pole variance, nobody prices which pole shows up.' }),
      'https://www.wildlyplay.com',
      'no-play-mexico-vs-south-africa-2026-07-04',
    );
    expect(msg).toContain('No position — two-pole variance, nobody prices which pole shows up.');
  });

  it('falls back to the reason label when verdict is absent', () => {
    const msg = formatNoPlayMessage(noplay({ reason: 'VARIANCE_TOO_HIGH' }), 'https://www.wildlyplay.com', 'slug');
    expect(msg).toContain('Variance too high to justify a stake');
  });

  it('never dumps the long-form note into the card, even when note is set and verdict is not', () => {
    const longNote = 'Argentina at 84% with the full first team — Messi and Lautaro both start — against a Cape Verde side set up to contain, with the keeper who once held Spain scoreless.';
    const msg = formatNoPlayMessage(noplay({ note: longNote }), 'https://www.wildlyplay.com', 'slug');
    expect(msg).not.toContain(longNote);
  });
});
