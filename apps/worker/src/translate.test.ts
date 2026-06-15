import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildThesisContentRows, buildThesisTranslationPrompt, publishThesisTranslations } from './translate';
import { MemoryStore, type PickRow } from './store';

function publishedPick(overrides: Partial<PickRow> = {}): PickRow {
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
    ...overrides,
  };
}

const FOUR_SECTIONS = [
  '\u{1F1EC}\u{1F1E7} Mexico dominant at home and the visitors are missing both starting CBs',
  '\u{1F1FB}\u{1F1F3} Mexico áp đảo sân nhà, đội khách mất cả hai trung vệ đá chính',
  '\u{1F1F9}\u{1F1ED} เม็กซิโกเหนือกว่าในบ้าน ทีมเยือนขาดเซ็นเตอร์ตัวจริงทั้งคู่',
  '\u{1F1EA}\u{1F1F8} México dominante en casa y a la visita le faltan sus dos centrales titulares',
].join('\n\n');

describe('buildThesisTranslationPrompt', () => {
  const prompt = buildThesisTranslationPrompt(publishedPick());

  it('includes the matchup, pick details and the thesis', () => {
    expect(prompt).toContain('Mexico vs South Africa');
    expect(prompt).toContain('Mexico -1.25 @ 2.05');
    expect(prompt).toContain('missing both starting CBs');
  });

  it('asks for all four flag sections, EN echoed verbatim', () => {
    expect(prompt).toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).toContain('\u{1F1F9}\u{1F1ED}');
    expect(prompt).toContain('\u{1F1EA}\u{1F1F8}');
    expect(prompt).toContain('echoed verbatim');
  });

  it('keeps responsible language: translation only, no promises of profit', () => {
    expect(prompt).toContain('promise of profit');
  });
});

describe('buildThesisContentRows', () => {
  it('splits a 4-section response into vi/th/es rows (en discarded)', () => {
    const rows = buildThesisContentRows(publishedPick(), FOUR_SECTIONS, 'test-model');
    expect(rows.map((r) => r.lang)).toEqual(['vi', 'th', 'es']);
    expect(rows[0]).toEqual({
      pick_id: 'pick-1',
      lang: 'vi',
      title: 'Mexico -1.25',
      body_md: 'Mexico áp đảo sân nhà, đội khách mất cả hai trung vệ đá chính',
      model: 'test-model',
    });
    expect(rows[1].body_md).toContain('เม็กซิโก');
    expect(rows[2].body_md).toContain('México dominante');
  });

  it('returns [] on garbage input without flag headers', () => {
    expect(buildThesisContentRows(publishedPick(), 'no flags anywhere')).toEqual([]);
  });

  it('returns [] when the EN section is missing (splitLangSections contract)', () => {
    const noEn = '\u{1F1FB}\u{1F1F3} chỉ tiếng Việt\n\u{1F1EA}\u{1F1F8} solo español';
    expect(buildThesisContentRows(publishedPick(), noEn)).toEqual([]);
  });
});

describe('publishThesisTranslations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('generates and upserts the vi/th/es rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();

    await publishThesisTranslations({ store, env: { apiKey: 'k' } }, publishedPick());

    expect(store.pickContent.size).toBe(3);
    expect(store.pickContent.get('pick-1:vi')).toMatchObject({ title: 'Mexico -1.25' });
  });

  it('stores nothing without an api key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();

    await publishThesisTranslations({ store, env: { apiKey: undefined } }, publishedPick());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.pickContent.size).toBe(0);
  });

  it('never throws when the upsert fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    store.upsertPickContent = vi.fn(async () => { throw new Error('pick_content down'); });

    await expect(
      publishThesisTranslations({ store, env: { apiKey: 'k' } }, publishedPick()),
    ).resolves.toBeUndefined();
  });
});
