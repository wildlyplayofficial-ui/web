import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPreviewPosts, buildPreviewPrompt, publishPreview } from './preview';
import { disclosureFor } from './recap';
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

const BILINGUAL = '\u{1F1EC}\u{1F1E7} Mexico open at home.\n\n\u{1F1FB}\u{1F1F3} Mexico mở màn sân nhà.';

describe('buildPreviewPrompt', () => {
  const prompt = buildPreviewPrompt(publishedPick());

  it('includes the matchup, league, pick details and the thesis', () => {
    expect(prompt).toContain('Mexico vs South Africa');
    expect(prompt).toContain('FIFA World Cup 2026 — Group A');
    expect(prompt).toContain('Mexico -1.25 @ 2.05');
    expect(prompt).toContain('missing both starting CBs');
    expect(prompt).not.toContain('live @');
  });

  it('marks a running pick with the score at entry', () => {
    const running = buildPreviewPrompt(publishedPick({ publish_score_home: 1, publish_score_away: 0 }));
    expect(running).toContain('(live @ 1-0)');
  });

  it('instructs no invented facts, responsible language, ONLY the VI flag and the VI disclosure', () => {
    expect(prompt).toContain('Do NOT invent');
    expect(prompt).toContain('"sure win"');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).not.toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('Con người chọn trận, AI viết bài.');
    expect(prompt).not.toContain('Human-picked, AI-written.');
  });
});

describe('buildPreviewPrompt — disclosure (Tiered Picks §12 firewall)', () => {
  it('renders the curator (real_human) disclosure in vi — and ONLY vi', () => {
    const prompt = buildPreviewPrompt(publishedPick({ author: 'curator' }));
    expect(prompt).toContain(disclosureFor('real_human', 'vi'));
    for (const lang of ['en', 'th', 'es'] as const) {
      expect(prompt).not.toContain(disclosureFor('real_human', lang));
    }
  });

  it('renders the scout (fictional_ai) disclosure in vi — and ONLY vi', () => {
    const prompt = buildPreviewPrompt(publishedPick({ author: 'scout' }));
    expect(prompt).toContain(disclosureFor('fictional_ai', 'vi'));
    for (const lang of ['en', 'th', 'es'] as const) {
      expect(prompt).not.toContain(disclosureFor('fictional_ai', lang));
    }
  });

  it('never leaks the curator wording into a scout pick prompt', () => {
    const prompt = buildPreviewPrompt(publishedPick({ author: 'scout' }));
    expect(prompt).not.toContain(disclosureFor('real_human', 'vi'));
  });
});

describe('buildPreviewPosts', () => {
  it('builds a single published vi row with slug preview-{team-vs-team} (chỉ tiếng Việt)', () => {
    const posts = buildPreviewPosts(publishedPick(), BILINGUAL);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: 'preview',
      slug: 'preview-mexico-vs-south-africa',
      lang: 'vi',
      title: 'Nhận định: Mexico vs South Africa',
      body_md: 'Mexico mở màn sân nhà.',
      pick_ids: ['pick-1'],
      status: 'published',
    });
    expect(posts[0].published_at).toBeTruthy();
    expect(posts.map((p) => p.lang)).toEqual(['vi']);
  });

  it('falls back to a single vi row with the whole text when the split fails', () => {
    const posts = buildPreviewPosts(publishedPick(), '  no flags here  ');
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ lang: 'vi', body_md: 'no flags here', status: 'published' });
  });
});

describe('publishPreview', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('generates and stores the preview posts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: BILINGUAL }] }),
    })));
    const store = new MemoryStore();

    await publishPreview({ store, env: { apiKey: 'k' } }, publishedPick());

    expect(store.posts).toHaveLength(1);
    expect(store.posts[0]).toMatchObject({ type: 'preview', slug: 'preview-mexico-vs-south-africa', lang: 'vi' });
  });

  it('stores nothing without an api key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();

    await publishPreview({ store, env: { apiKey: undefined } }, publishedPick());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.posts).toHaveLength(0);
  });

  it('never throws when insertPost fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: BILINGUAL }] }),
    })));
    const store = new MemoryStore();
    store.insertPost = vi.fn(async () => { throw new Error('posts table down'); });

    await expect(publishPreview({ store, env: { apiKey: 'k' } }, publishedPick())).resolves.toBeUndefined();
  });
});
