import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNewsSlug, buildWatchingNewsPrompt, buildNewsPosts, publishWatchingNews } from './watching-news';
import { MemoryStore, type WatchingRow } from './store';

function activeWatching(overrides: Partial<WatchingRow> = {}): WatchingRow {
  return {
    id: 'w-1',
    home_team: 'Mexico',
    away_team: 'South Africa',
    league: 'FIFA World Cup 2026 — Group A',
    kickoff_utc: '2026-06-11T19:00:00.000Z',
    note: 'Mexico dominant at home, visitors missing key players',
    note_translations: null,
    status: 'active',
    created_at: '2026-06-11T10:00:00.000Z',
    pick_id: null,
    buzz_history: [],
    author: 'curator',
    ...overrides,
  };
}

const FOUR_SECTIONS = [
  '\u{1F1EC}\u{1F1E7}',
  '[META_TITLE] Mexico vs South Africa Preview - World Cup 2026',
  '[META_DESC] Preview of Mexico vs South Africa in the FIFA World Cup 2026 Group A opener at Estadio Azteca.',
  '[KEYWORD] Mexico vs South Africa preview',
  '',
  'Mexico host South Africa in the World Cup 2026 opener. AI-written — WildlyPlay Newsroom',
  '',
  '\u{1F1FB}\u{1F1F3}',
  '[META_TITLE] Trước trận Mexico vs Nam Phi - World Cup 2026',
  '[META_DESC] Nhận định trước trận Mexico gặp Nam Phi tại bảng A World Cup 2026.',
  '[KEYWORD] Mexico vs Nam Phi nhận định',
  '',
  'Mexico đón tiếp Nam Phi trên sân nhà. AI-written — WildlyPlay Newsroom',
  '',
  '\u{1F1F9}\u{1F1ED}',
  '[META_TITLE] พรีวิว เม็กซิโก vs แอฟริกาใต้ ฟุตบอลโลก 2026',
  '[META_DESC] วิเคราะห์ก่อนเกมเม็กซิโก พบ แอฟริกาใต้ ฟุตบอลโลก 2026 กลุ่มเอ',
  '[KEYWORD] เม็กซิโก vs แอฟริกาใต้ พรีวิว',
  '',
  'เม็กซิโกเปิดบ้านรับแอฟริกาใต้ AI-written — WildlyPlay Newsroom',
  '',
  '\u{1F1EA}\u{1F1F8}',
  '[META_TITLE] Previa México vs Sudáfrica - Mundial 2026',
  '[META_DESC] Análisis previo del partido México contra Sudáfrica en el Grupo A del Mundial 2026.',
  '[KEYWORD] México vs Sudáfrica previa',
  '',
  'México recibe a Sudáfrica en el inicio del Mundial. AI-written — WildlyPlay Newsroom',
].join('\n');

describe('buildNewsSlug', () => {
  it('builds news-{home}-vs-{away}-{date} slug', () => {
    expect(buildNewsSlug('Mexico', 'South Africa', '2026-06-11T19:00:00.000Z'))
      .toBe('news-mexico-vs-south-africa-2026-06-11');
  });
});

describe('buildWatchingNewsPrompt', () => {
  const prompt = buildWatchingNewsPrompt(activeWatching());

  it('includes the matchup, league, and kickoff', () => {
    expect(prompt).toContain('Mexico vs South Africa');
    expect(prompt).toContain('FIFA World Cup 2026 — Group A');
    expect(prompt).toContain('2026-06-11 19:00');
  });

  it('includes the curator note', () => {
    expect(prompt).toContain('Mexico dominant at home');
  });

  it('omits curator note line when note is null', () => {
    const noNote = buildWatchingNewsPrompt(activeWatching({ note: null }));
    expect(noNote).not.toContain('Curator note');
  });

  it('asks for 4 language sections with meta fields', () => {
    expect(prompt).toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).toContain('\u{1F1F9}\u{1F1ED}');
    expect(prompt).toContain('\u{1F1EA}\u{1F1F8}');
    expect(prompt).toContain('[META_TITLE]');
    expect(prompt).toContain('[META_DESC]');
    expect(prompt).toContain('[KEYWORD]');
  });

  it('asks for 400-600 words and neutral tone', () => {
    expect(prompt).toContain('400-600 words');
    expect(prompt).toContain('Neutral and informative');
  });

  it('instructs responsible language and disclosure', () => {
    expect(prompt).toContain('"sure win"');
    expect(prompt).toContain('AI-written');
  });
});

describe('buildNewsPosts', () => {
  it('builds 4 published posts with meta fields when split succeeds', () => {
    const posts = buildNewsPosts(activeWatching(), FOUR_SECTIONS);
    expect(posts).toHaveLength(4);

    expect(posts[0]).toMatchObject({
      type: 'news',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      lang: 'en',
      title: 'Mexico vs South Africa Preview - World Cup 2026',
      meta_title: 'Mexico vs South Africa Preview - World Cup 2026',
      meta_description: expect.stringContaining('Preview of Mexico'),
      target_keyword: 'Mexico vs South Africa preview',
      pick_ids: [],
      status: 'published',
    });
    expect(posts[0].body_md).toContain('Mexico host South Africa');
    expect(posts[0].published_at).toBeTruthy();

    expect(posts[1]).toMatchObject({ lang: 'vi', type: 'news' });
    expect(posts[2]).toMatchObject({ lang: 'th', type: 'news' });
    expect(posts[3]).toMatchObject({ lang: 'es', type: 'news' });
  });

  it('falls back to a single en row when the split fails', () => {
    const posts = buildNewsPosts(activeWatching(), '  no flags here  ');
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: 'news',
      lang: 'en',
      body_md: 'no flags here',
      meta_title: null,
      meta_description: null,
      target_keyword: null,
    });
  });
});

describe('publishWatchingNews', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('generates and stores news posts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();

    await publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching());

    expect(store.posts).toHaveLength(4);
    expect(store.posts[0]).toMatchObject({
      type: 'news',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      lang: 'en',
    });
  });

  it('skips when slug already exists (dedup)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();
    // Pre-populate with existing news slug
    await store.insertPost({
      type: 'news',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      lang: 'en',
      title: 'Existing',
      body_md: 'Already exists',
      pick_ids: [],
      status: 'published',
      published_at: new Date().toISOString(),
      author: 'curator',
    });

    await publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching());

    // Should not call Claude at all
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing without an api key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();

    await publishWatchingNews({ store, env: { apiKey: undefined } }, activeWatching());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.posts).toHaveLength(0);
  });

  it('never throws when insertPost fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    store.insertPost = vi.fn(async () => { throw new Error('posts table down'); });

    await expect(
      publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching()),
    ).resolves.toBeUndefined();
  });

  it('never throws when Claude API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const store = new MemoryStore();

    await expect(
      publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching()),
    ).resolves.toBeUndefined();
    expect(store.posts).toHaveLength(0);
  });
});
