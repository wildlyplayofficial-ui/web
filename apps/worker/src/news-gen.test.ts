import { describe, expect, it } from 'vitest';
import {
  GEN_NEWS_TYPES, buildMatchNewsSlug, buildStandingsSlug, isSlugSafe,
  computeForm, prioritize, type FinishedMatch,
} from './news-gen';
import { NEWS_LANGS, renderPreview, renderResult, renderStandings } from './news-gen-templates';

describe('slug builder', () => {
  it('is deterministic (spec test case 1)', () => {
    expect(buildMatchNewsSlug('preview', 'Man City', 'Real Madrid', '2026-07-20T19:00Z'))
      .toBe('preview-man-city-vs-real-madrid-2026-07-20');
    expect(buildMatchNewsSlug('result', 'Man City', 'Real Madrid', '2026-07-20T19:00Z'))
      .toBe('result-man-city-vs-real-madrid-2026-07-20');
  });

  it('strips diacritics', () => {
    expect(buildMatchNewsSlug('preview', 'América', 'São Paulo', '2026-07-20T19:00Z'))
      .toBe('preview-america-vs-sao-paulo-2026-07-20');
  });

  it('builds standings slug from competition id + date', () => {
    expect(buildStandingsSlug('epl-2026', '2026-07-13')).toBe('standings-epl-2026-2026-07-13');
  });
});

describe('slug guard (spec test case 2 — news- prefix banned)', () => {
  it('rejects news- prefix (live redirect would swallow the URL)', () => {
    expect(isSlugSafe('news-man-city-vs-real-madrid')).toBe(false);
  });

  it('accepts generated slugs', () => {
    expect(isSlugSafe(buildMatchNewsSlug('preview', 'Man City', 'Real Madrid', '2026-07-20T19:00Z'))).toBe(true);
    expect(isSlugSafe(buildMatchNewsSlug('result', 'Arsenal', 'Chelsea', '2026-07-21T15:00Z'))).toBe(true);
    expect(isSlugSafe(buildStandingsSlug('epl-2026', '2026-07-13'))).toBe(true);
  });

  it('rejects malformed slugs', () => {
    expect(isSlugSafe('Preview-A-vs-B')).toBe(false);
    expect(isSlugSafe('preview--')).toBe(true); // dashes fine, charset only
    expect(isSlugSafe('preview a vs b')).toBe(false);
  });
});

describe('NEWS_TYPES contract (worker subset of apps/web/lib/news.ts canonical list)', () => {
  const CANONICAL = ['preview', 'result', 'standings', 'transfer', 'general'];
  it('every generated type is canonical', () => {
    for (const t of GEN_NEWS_TYPES) expect(CANONICAL).toContain(t);
  });
});

describe('computeForm (Jane #1 form-degrade)', () => {
  const m = (home: string, away: string, hs: number, as: number, day: string): FinishedMatch =>
    ({ home_team: home, away_team: away, home_score: hs, away_score: as, kickoff_utc: `${day}T15:00:00Z` });

  it('returns null with <3 historical matches', () => {
    const hist = [m('Arsenal', 'Chelsea', 2, 0, '2026-07-01'), m('Spurs', 'Arsenal', 1, 1, '2026-07-05')];
    expect(computeForm('Arsenal', hist)).toBeNull();
  });

  it('builds W/D/L most-recent-first, capped at 5', () => {
    const hist = [
      m('Arsenal', 'Chelsea', 2, 0, '2026-07-01'), // W
      m('Spurs', 'Arsenal', 1, 1, '2026-07-03'),   // D (away)
      m('Arsenal', 'Villa', 0, 1, '2026-07-06'),   // L
      m('Everton', 'Arsenal', 0, 3, '2026-07-09'), // W (away)
      m('Arsenal', 'Fulham', 1, 0, '2026-07-11'),  // W
      m('Arsenal', 'Brighton', 0, 0, '2026-06-20'),// older — dropped by cap
    ];
    expect(computeForm('Arsenal', hist)).toBe('W-W-L-D-W');
  });

  it('ignores matches of other teams and null scores', () => {
    const hist = [
      m('Chelsea', 'Spurs', 1, 0, '2026-07-01'),
      { ...m('Arsenal', 'Chelsea', 0, 0, '2026-07-02'), home_score: null },
    ];
    expect(computeForm('Arsenal', hist)).toBeNull();
  });
});

describe('prioritize (D3: pick > watching > tier, then kickoff)', () => {
  const c = (id: string, hasPick: boolean, hasWatching: boolean, tier: number, k = '2026-07-20T15:00:00Z') =>
    ({ id, hasPick, hasWatching, tier, kickoffUtc: k });

  it('orders pick > watching > tier and applies cap', () => {
    const items = [
      c('tier0', false, false, 0),
      c('watch', false, true, 5),
      c('pick', true, false, 9),
      c('tier2', false, false, 2),
    ];
    const out = prioritize(items, 3).map((i) => i.id);
    expect(out).toEqual(['pick', 'watch', 'tier0']);
  });

  it('breaks ties by earlier kickoff', () => {
    const items = [
      c('later', false, false, 1, '2026-07-20T20:00:00Z'),
      c('sooner', false, false, 1, '2026-07-20T12:00:00Z'),
    ];
    expect(prioritize(items, 2)[0].id).toBe('sooner');
  });

  it('cap 0 returns empty', () => {
    expect(prioritize([c('a', true, true, 0)], 0)).toEqual([]);
  });
});

describe('templates (4-lang, deterministic)', () => {
  const previewData = {
    home: 'Man City', away: 'Real Madrid', competition: 'FIFA World Cup',
    dateUtc: '2026-07-20', formHome: 'W-W-D', formAway: null, pickUrl: null,
  };

  it('renders all 4 languages with non-empty headline + body', () => {
    for (const lang of NEWS_LANGS) {
      const p = renderPreview(lang, previewData);
      expect(p.headline).toContain('Man City');
      expect(p.body.length).toBeGreaterThan(20);
      const r = renderResult(lang, { home: 'A', away: 'B', homeScore: 2, awayScore: 1, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null });
      expect(r.headline).toContain('2-1');
      const s = renderStandings(lang, { competition: 'EPL', dateUtc: '2026-07-13', rows: [{ rank: 1, name: 'Arsenal', played: 3, points: 9 }] });
      expect(s.body).toContain('Arsenal');
    }
  });

  it('omits form line when null, includes when present', () => {
    const p = renderPreview('en', previewData);
    expect(p.body).toContain('Man City: W-W-D');
    expect(p.body).not.toContain('Real Madrid:');
  });

  it('mentions pick only when pickUrl set (no betting talk otherwise)', () => {
    const noPick = renderPreview('en', previewData);
    expect(noPick.body).not.toContain('pick');
    const withPick = renderPreview('en', { ...previewData, pickUrl: 'https://x/play/1' });
    expect(withPick.body).toContain('https://x/play/1');
  });

  it('result outcome: win vs draw sentence', () => {
    const win = renderResult('en', { home: 'A', away: 'B', homeScore: 0, awayScore: 2, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null });
    expect(win.body).toContain('B took the win');
    const draw = renderResult('en', { home: 'A', away: 'B', homeScore: 1, awayScore: 1, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null });
    expect(draw.body).toContain('draw');
  });

  it('bodies carry UTC dates only — no local-time strings', () => {
    for (const lang of NEWS_LANGS) {
      const p = renderPreview(lang, previewData);
      expect(p.body).toContain('2026-07-20');
      expect(p.body).not.toMatch(/\d{1,2}:\d{2}\s?(AM|PM|am|pm)/);
    }
  });
});
