import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRecapArticlePrompt,
  buildRecapPosts,
  buildRecapPrompt,
  clvContextLine,
  computeRecord,
  disclosureFor,
  generateRecap,
  splitLangSections,
} from './recap';
import type { PickRow } from './store';

function settledPick(overrides: Partial<PickRow> = {}): PickRow {
  return {
    id: 'pick-1',
    fixture_id: 0,
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

describe('computeRecord', () => {
  it('counts W-L-P, excludes void from counts, sums all units, rounds float noise', () => {
    const record = computeRecord([
      settledPick({ status: 'won', units_pl: 1.05 }),
      settledPick({ status: 'won', units_pl: 0.48 }), // half-win
      settledPick({ status: 'lost', units_pl: -1 }),
      settledPick({ status: 'lost', units_pl: -0.5 }), // half-loss
      settledPick({ status: 'push', units_pl: 0 }),
      settledPick({ status: 'void', units_pl: 0 }),
    ]);
    expect(record).toEqual({ won: 2, lost: 2, push: 1, units: 0.03 }); // 1.05+0.48-1-0.5 has float noise
  });

  it('returns zeros for no settled picks', () => {
    expect(computeRecord([])).toEqual({ won: 0, lost: 0, push: 0, units: 0 });
  });
});

describe('buildRecapPrompt', () => {
  const prompt = buildRecapPrompt(settledPick(), { won: 3, lost: 1, push: 0, units: 2.55 });

  it('includes teams, final score, league, pick details and outcome', () => {
    expect(prompt).toContain('Mexico 3-0 South Africa');
    expect(prompt).toContain('FIFA World Cup 2026 — Group A');
    expect(prompt).toContain('Mexico -1.25 @ 2.05');
    expect(prompt).toContain('win (+1.05 units)');
  });

  it('includes the thesis and the updated record', () => {
    expect(prompt).toContain('missing both starting CBs');
    expect(prompt).toContain('3-1-0 (W-L-P), +2.55 units total');
  });

  it('instructs responsible language and both flag sections', () => {
    expect(prompt).toContain('"sure win"');
    expect(prompt).toContain('"guaranteed"');
    expect(prompt).toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
  });
});

describe('clvContextLine — No-Fabricated-Fact guard', () => {
  it('returns empty string when no closing odds were captured', () => {
    expect(clvContextLine(settledPick({ odds_close: null }))).toBe('');
  });

  it('renders the exact publish and closing numbers when captured', () => {
    expect(clvContextLine(settledPick({ odds_publish: 2.05, odds_close: 1.85 }))).toBe(
      '\nClosing odds: 1.85 (published at 2.05)',
    );
  });
});

describe('CLV wiring into recap prompts', () => {
  it('omits the closing line and never mentions closing when odds_close is null', () => {
    const prompt = buildRecapPrompt(settledPick({ odds_close: null }), { won: 1, lost: 0, push: 0, units: 1.05 });
    expect(prompt).not.toContain('Closing odds:');
    expect(prompt).toContain('- Closing line:'); // the rule is present so the model knows to stay silent
  });

  it('surfaces the captured closing odds to the channel recap prompt', () => {
    const prompt = buildRecapPrompt(settledPick({ odds_publish: 2.05, odds_close: 1.85 }), { won: 1, lost: 0, push: 0, units: 1.05 });
    expect(prompt).toContain('Closing odds: 1.85 (published at 2.05)');
  });

  it('surfaces the captured closing odds to the newsroom article prompt', () => {
    const prompt = buildRecapArticlePrompt(settledPick({ odds_publish: 2.05, odds_close: 1.85 }), { won: 1, lost: 0, push: 0, units: 1.05 });
    expect(prompt).toContain('Closing odds: 1.85 (published at 2.05)');
  });
});

describe('buildRecapArticlePrompt — disclosure (Tiered Picks §12 firewall)', () => {
  const record = { won: 3, lost: 1, push: 0, units: 2.55 };

  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the curator (real_human) disclosure in %s',
    (lang) => {
      const prompt = buildRecapArticlePrompt(settledPick({ author: 'curator' }), record);
      expect(prompt).toContain(disclosureFor('real_human', lang));
    },
  );

  it.each(['en', 'vi', 'th', 'es'] as const)(
    'renders the scout (fictional_ai) disclosure in %s',
    (lang) => {
      const prompt = buildRecapArticlePrompt(settledPick({ author: 'scout' }), record);
      expect(prompt).toContain(disclosureFor('fictional_ai', lang));
    },
  );

  it('never leaks the curator wording into a scout pick prompt', () => {
    const prompt = buildRecapArticlePrompt(settledPick({ author: 'scout' }), record);
    expect(prompt).not.toContain(disclosureFor('real_human', 'en'));
  });
});

const BILINGUAL = '\u{1F1EC}\u{1F1E7} The hosts ran away with it.\nRecord: 1-0-0, +1.05u\n\n\u{1F1FB}\u{1F1F3} Chủ nhà thắng thuyết phục.\nThành tích: 1-0-0, +1.05u';

const QUAD = BILINGUAL + '\n\n\u{1F1F9}\u{1F1ED} เจ้าบ้านชนะขาด\n\n\u{1F1EA}\u{1F1F8} El local ganó con autoridad.';

describe('splitLangSections', () => {
  it('splits a bilingual text on the flag headers', () => {
    expect(splitLangSections(BILINGUAL)).toEqual({
      en: 'The hosts ran away with it.\nRecord: 1-0-0, +1.05u',
      vi: 'Chủ nhà thắng thuyết phục.\nThành tích: 1-0-0, +1.05u',
    });
  });

  it('splits all four language sections', () => {
    expect(splitLangSections(QUAD)).toEqual({
      en: 'The hosts ran away with it.\nRecord: 1-0-0, +1.05u',
      vi: 'Chủ nhà thắng thuyết phục.\nThành tích: 1-0-0, +1.05u',
      th: 'เจ้าบ้านชนะขาด',
      es: 'El local ganó con autoridad.',
    });
  });

  it('returns null when no flags are present', () => {
    expect(splitLangSections('plain english recap, no flags')).toBeNull();
  });

  it('returns null when the EN section is missing or empty', () => {
    expect(splitLangSections('\u{1F1EC}\u{1F1E7} \u{1F1FB}\u{1F1F3} only vietnamese')).toBeNull();
    expect(splitLangSections('\u{1F1FB}\u{1F1F3} only vietnamese')).toBeNull();
  });

  it('drops an empty trailing section but keeps the rest', () => {
    expect(splitLangSections('\u{1F1EC}\u{1F1E7} english \u{1F1FB}\u{1F1F3} tiếng việt \u{1F1F9}\u{1F1ED}')).toEqual({
      en: 'english',
      vi: 'tiếng việt',
    });
  });
});

describe('buildRecapPosts', () => {
  it('builds en + vi published rows with slug recap-{team-vs-team-score} and score titles (decision #19)', () => {
    const posts = buildRecapPosts(settledPick(), BILINGUAL);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      type: 'recap',
      slug: 'recap-mexico-vs-south-africa-3-0',
      lang: 'en',
      title: 'Recap: Mexico 3-0 South Africa',
      body_md: 'The hosts ran away with it.\nRecord: 1-0-0, +1.05u',
      pick_ids: ['pick-1'],
      status: 'published',
    });
    expect(posts[0].published_at).toBeTruthy();
    expect(posts[1]).toMatchObject({
      slug: 'recap-mexico-vs-south-africa-3-0',
      lang: 'vi',
      title: 'Nhìn lại: Mexico 3-0 South Africa',
      body_md: 'Chủ nhà thắng thuyết phục.\nThành tích: 1-0-0, +1.05u',
      status: 'published',
    });
  });

  it('falls back to a single en row with the whole text when the split fails', () => {
    const posts = buildRecapPosts(settledPick(), '  no flags in this recap  ');
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      lang: 'en',
      title: 'Recap: Mexico 3-0 South Africa',
      body_md: 'no flags in this recap',
      status: 'published',
    });
  });
});

describe('generateRecap', () => {
  const record = { won: 1, lost: 0, push: 0, units: 1.05 };

  afterEach(() => vi.unstubAllGlobals());

  it('returns null without an api key and never calls fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await generateRecap({ apiKey: undefined }, settledPick(), record)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the text from a successful Anthropic response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: '  A solid night for the thesis.  ' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await generateRecap({ apiKey: 'k', model: 'test-model' }, settledPick(), record);

    expect(text).toBe('A solid night for the thesis.');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('k');
    expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('test-model');
    expect(body.max_tokens).toBe(1200); // 4-language channel recap (Nick 13/6)
    expect(body.messages[0].role).toBe('user');
  });

  it('returns null on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    expect(await generateRecap({ apiKey: 'k' }, settledPick(), record)).toBeNull();
  });

  it('returns null on an unexpected response shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [] }) })));
    expect(await generateRecap({ apiKey: 'k' }, settledPick(), record)).toBeNull();
  });

  it('returns null (never throws) when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(generateRecap({ apiKey: 'k' }, settledPick(), record)).resolves.toBeNull();
  });
});
