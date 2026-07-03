import { describe, expect, it } from 'vitest';
import { buildPostmortemArticlePrompt } from './postmortem-article';
import { disclosureFor } from './recap';
import type { PickRow } from './store';

function settledPick(overrides: Partial<PickRow> = {}): PickRow {
  return {
    id: 'pick-1',
    fixture_id: 66456904,
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
    thesis: 'Mexico dominant at home and the visitors are missing both starting CBs',
    status: 'won',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: 3,
    away_score: 0,
    raw_outcome: 'win',
    units_pl: 1.05,
    settled_at: '2026-06-11T21:00:00.000Z',
    loss_type: null,
    postmortem_draft: null,
    postmortem_approved: 'The thesis played out cleanly.',
    confidence: null,
    primary_edge: null,
    consensus_edge_pct: null,
    supporting_evidence: null,
    postmortem_status: null,
    postmortem_at: null,
    market_side: null,
    favored_dog: null,
    author: 'curator',
    ...overrides,
  };
}

describe('buildPostmortemArticlePrompt — disclosure (Tiered Picks §12 firewall)', () => {
  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the curator (real_human) disclosure in %s',
    (lang) => {
      const prompt = buildPostmortemArticlePrompt(settledPick({ author: 'curator' }));
      expect(prompt).toContain(disclosureFor('real_human', lang));
    },
  );

  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the scout (fictional_ai) disclosure in %s',
    (lang) => {
      const prompt = buildPostmortemArticlePrompt(settledPick({ author: 'scout' }));
      expect(prompt).toContain(disclosureFor('fictional_ai', lang));
    },
  );

  it('never leaks the curator wording into a scout post-mortem prompt', () => {
    const prompt = buildPostmortemArticlePrompt(settledPick({ author: 'scout' }));
    expect(prompt).not.toContain(disclosureFor('real_human', 'en'));
  });
});
