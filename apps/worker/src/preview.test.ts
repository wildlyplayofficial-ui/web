import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPreviewPosts, buildPreviewPrompt, publishPreview } from './preview';
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

  it('instructs no invented facts, responsible language, both flags and the disclosure', () => {
    expect(prompt).toContain('Do NOT invent');
    expect(prompt).toContain('"sure win"');
    expect(prompt).toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).toContain('Human-picked, AI-written.');
  });
});

describe('buildPreviewPosts', () => {
  it('builds published en + vi rows with slug preview-{team-vs-team} (decision #19)', () => {
    const posts = buildPreviewPosts(publishedPick(), BILINGUAL);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      type: 'preview',
      slug: 'preview-mexico-vs-south-africa',
      lang: 'en',
      title: 'Preview: Mexico vs South Africa',
      body_md: 'Mexico open at home.',
      pick_ids: ['pick-1'],
      status: 'published',
    });
    expect(posts[0].published_at).toBeTruthy();
    expect(posts[1]).toMatchObject({
      slug: 'preview-mexico-vs-south-africa',
      lang: 'vi',
      title: 'Trước trận: Mexico vs South Africa',
      body_md: 'Mexico mở màn sân nhà.',
      status: 'published',
    });
  });

  it('falls back to a single en row with the whole text when the split fails', () => {
    const posts = buildPreviewPosts(publishedPick(), '  no flags here  ');
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ lang: 'en', body_md: 'no flags here', status: 'published' });
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

    expect(store.posts).toHaveLength(2);
    expect(store.posts[0]).toMatchObject({ type: 'preview', slug: 'preview-mexico-vs-south-africa', lang: 'en' });
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
