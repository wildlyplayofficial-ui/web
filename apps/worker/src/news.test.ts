import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt, detectPolarityInversion, type AnalysisContext, type AnalysisTopic } from './news';
import { disclosureFor } from './recap';
import type { PickRow } from './store';

function analysisPick(overrides: Partial<PickRow> = {}): PickRow {
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
    status: 'published',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
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
    author: 'curator',
    ...overrides,
  };
}

function analysisCtx(pick: PickRow | null): AnalysisContext {
  const topic: AnalysisTopic = {
    fixture_id: 66456904,
    league: 'FIFA World Cup 2026 — Group A',
    home_team: 'Mexico',
    away_team: 'South Africa',
    kickoff_utc: '2026-06-11T19:00:00.000Z',
    related_pick_ids: pick ? [pick.id] : [],
    has_pick: pick !== null,
    pick,
  };
  return { topic, record: { won: 0, lost: 0, push: 0, units: 0 }, facts: [] };
}

describe('buildAnalysisPrompt — disclosure (Tiered Picks §12 firewall)', () => {
  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the curator (real_human) disclosure in %s',
    (lang) => {
      const prompt = buildAnalysisPrompt(analysisCtx(analysisPick({ author: 'curator' })));
      expect(prompt).toContain(disclosureFor('real_human', lang));
    },
  );

  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the scout (fictional_ai) disclosure in %s',
    (lang) => {
      const prompt = buildAnalysisPrompt(analysisCtx(analysisPick({ author: 'scout' })));
      expect(prompt).toContain(disclosureFor('fictional_ai', lang));
    },
  );

  it('defaults to the curator disclosure when no pick is attached', () => {
    const prompt = buildAnalysisPrompt(analysisCtx(null));
    expect(prompt).toContain(disclosureFor('real_human', 'en'));
  });

  it('never leaks the curator wording into a scout pick prompt', () => {
    const prompt = buildAnalysisPrompt(analysisCtx(analysisPick({ author: 'scout' })));
    expect(prompt).not.toContain(disclosureFor('real_human', 'en'));
  });
});

describe('detectPolarityInversion', () => {
  it('flags a disclosed disadvantage rendered as hype vocabulary (the live regression case)', () => {
    const body = 'Consensus pricing suggests roughly a 5% edge, and internal quantification places this at breakeven-at-best.';
    expect(detectPolarityInversion(-5, body)).toMatch(/polarity inversion suspected/);
  });

  it('does not flag when the disadvantage is described honestly', () => {
    const body = 'Consensus pricing put this pick at roughly minus five percent — a judgment call, not an edge claim.';
    expect(detectPolarityInversion(-5, body)).toBeNull();
  });

  it('does not flag a genuine positive edge', () => {
    const body = 'Consensus pricing suggests roughly a 5% edge on this line.';
    expect(detectPolarityInversion(5, body)).toBeNull();
  });

  it('does not flag when no structured figure was provided', () => {
    expect(detectPolarityInversion(null, 'This is a 5% edge, no doubt.')).toBeNull();
  });
});
