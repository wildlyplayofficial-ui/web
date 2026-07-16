import { describe, expect, it } from 'vitest';
import {
  GEN_NEWS_TYPES, buildMatchNewsSlug, buildStandingsSlug, isSlugSafe,
  computeForm, prioritize, scoreFixture, SCORE_THRESHOLD, SCORE_P2_THRESHOLD,
  type FinishedMatch,
} from './news-gen';
import { NEWS_LANGS, formatDateUtc, renderPreview, renderResult, renderStandings } from './news-gen-templates';

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

describe('scoreFixture', () => {
  const NOW = new Date('2026-07-20T10:00:00Z').getTime();

  it('WC tier-1 match with two tier-1 teams scores high', () => {
    const s = scoreFixture({
      compTier: 1, homeTeam: 'Argentina', awayTeam: 'Brazil',
      kickoffUtc: '2026-07-20T14:00:00Z', hasPick: false, hasWatching: false, nowMs: NOW,
    });
    // comp=40 + team=max(15,15)+5=20 + matchup=20 (derby) + recency=5 (<6h? 4h=yes → 10) = 90
    expect(s.competition).toBe(40);
    expect(s.team).toBe(20); // both tier 1 → 15 + 5
    expect(s.matchup).toBe(20); // Argentina vs Brazil is a rivalry
    expect(s.recency).toBe(10); // 14:00-10:00=4h → <6h → 10
  });

  it('recency: <6h gives 10, <12h gives 5, >=12h gives 0', () => {
    const base = { compTier: 3, homeTeam: 'SomeTeam', awayTeam: 'OtherTeam', hasPick: false, hasWatching: false, nowMs: NOW };
    expect(scoreFixture({ ...base, kickoffUtc: '2026-07-20T14:00:00Z' }).recency).toBe(10); // 4h
    expect(scoreFixture({ ...base, kickoffUtc: '2026-07-20T20:00:00Z' }).recency).toBe(5);  // 10h
    expect(scoreFixture({ ...base, kickoffUtc: '2026-07-21T02:00:00Z' }).recency).toBe(0);  // 16h
  });

  it('pick/watching adds +10 bonus', () => {
    const base = { compTier: 3, homeTeam: 'SomeTeam', awayTeam: 'OtherTeam', kickoffUtc: '2026-07-21T02:00:00Z', nowMs: NOW };
    const withoutPick = scoreFixture({ ...base, hasPick: false, hasWatching: false });
    const withPick = scoreFixture({ ...base, hasPick: true, hasWatching: false });
    expect(withPick.total - withoutPick.total).toBe(10);
    expect(withPick.pickBonus).toBe(10);
  });

  it('derby match gets +20 matchup bonus', () => {
    const s = scoreFixture({
      compTier: 3, homeTeam: 'Real Madrid', awayTeam: 'Barcelona',
      kickoffUtc: '2026-07-21T02:00:00Z', hasPick: false, hasWatching: false, nowMs: NOW,
    });
    expect(s.matchup).toBe(20);
  });

  it('non-derby match gets 0 matchup bonus', () => {
    const s = scoreFixture({
      compTier: 3, homeTeam: 'Real Madrid', awayTeam: 'Getafe',
      kickoffUtc: '2026-07-21T02:00:00Z', hasPick: false, hasWatching: false, nowMs: NOW,
    });
    expect(s.matchup).toBe(0);
  });

  it('unknown comp tier defaults to 15', () => {
    const s = scoreFixture({
      compTier: 99, homeTeam: 'SomeTeam', awayTeam: 'OtherTeam',
      kickoffUtc: '2026-07-21T02:00:00Z', hasPick: false, hasWatching: false, nowMs: NOW,
    });
    expect(s.competition).toBe(15);
  });

  it('both teams tier 1/2 gets +5 team bonus', () => {
    const s = scoreFixture({
      compTier: 3, homeTeam: 'Liverpool', awayTeam: 'Arsenal',
      kickoffUtc: '2026-07-21T02:00:00Z', hasPick: false, hasWatching: false, nowMs: NOW,
    });
    // Liverpool=tier1(15), Arsenal=tier2(10) → max=15 + both<=2 bonus=5 → 20
    expect(s.team).toBe(20);
  });

  it('thresholds are sensible constants', () => {
    expect(SCORE_THRESHOLD).toBe(45);
    expect(SCORE_P2_THRESHOLD).toBe(60);
  });
});

describe('prioritize (score-based, then kickoff)', () => {
  const c = (id: string, score: number, k = '2026-07-20T15:00:00Z') =>
    ({ id, hasPick: false, hasWatching: false, tier: 1, kickoffUtc: k, score });

  it('orders by score descending and applies cap', () => {
    const items = [c('low', 30), c('mid', 55), c('high', 80), c('med', 50)];
    const out = prioritize(items, 3).map((i) => i.id);
    expect(out).toEqual(['high', 'mid', 'med']);
  });

  it('breaks ties by earlier kickoff', () => {
    const items = [
      c('later', 50, '2026-07-20T20:00:00Z'),
      c('sooner', 50, '2026-07-20T12:00:00Z'),
    ];
    expect(prioritize(items, 2)[0].id).toBe('sooner');
  });

  it('cap 0 returns empty', () => {
    expect(prioritize([c('a', 80)], 0)).toEqual([]);
  });
});

describe('templates (4-lang, deterministic)', () => {
  const previewData = {
    home: 'Man City', away: 'Real Madrid', competition: 'FIFA World Cup',
    dateUtc: '2026-07-20', formHome: 'W-W-D', formAway: null, pickUrl: null, pickAuthor: null,
  };

  it('renders all 4 languages with non-empty headline + body', () => {
    for (const lang of NEWS_LANGS) {
      const p = renderPreview(lang, previewData);
      expect(p.headline).toContain('Man City');
      expect(p.body.length).toBeGreaterThan(20);
      const r = renderResult(lang, { home: 'A', away: 'B', homeScore: 2, awayScore: 1, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null, pickAuthor: null });
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

  it('mentions pick only when pickUrl+pickAuthor set (no betting talk otherwise)', () => {
    const noPick = renderPreview('en', previewData);
    expect(noPick.body).not.toContain('pick');
    const withPick = renderPreview('en', { ...previewData, pickUrl: 'https://x/play/1', pickAuthor: 'The Scout' });
    expect(withPick.body).toContain('https://x/play/1');
    expect(withPick.body).toContain('The Scout');
    expect(withPick.body).not.toContain('The Curator'); // firewall: must match author
  });

  it('result outcome: win vs draw sentence', () => {
    const win = renderResult('en', { home: 'A', away: 'B', homeScore: 0, awayScore: 2, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null, pickAuthor: null });
    expect(win.body).toContain('B took the win');
    const draw = renderResult('en', { home: 'A', away: 'B', homeScore: 1, awayScore: 1, competition: 'EPL', dateUtc: '2026-07-20', pickUrl: null, pickAuthor: null });
    expect(draw.body).toContain('draw');
  });

  it('bodies carry human-readable dates, no raw ISO, no "(UTC)", no local-time (Jane+Nick 13/7)', () => {
    for (const lang of NEWS_LANGS) {
      const p = renderPreview(lang, previewData);
      expect(p.body).toContain(lang === 'en' ? '20 Jul 2026' : '20/07/2026');
      expect(p.body).not.toContain('2026-07-20'); // raw ISO must not leak
      expect(p.body).not.toContain('(UTC)'); // Nick: no raw "(UTC)" in display
      expect(p.body).not.toMatch(/\d{1,2}:\d{2}\s?(AM|PM|am|pm)/);
    }
  });

  it('formatDateUtc: static per-lang mapping, deterministic', () => {
    expect(formatDateUtc('en', '2026-07-17')).toBe('17 Jul 2026');
    expect(formatDateUtc('en', '2026-01-05')).toBe('5 Jan 2026');
    for (const lang of ['vi', 'th', 'es'] as const) {
      expect(formatDateUtc(lang, '2026-07-17')).toBe('17/07/2026');
    }
  });
});
