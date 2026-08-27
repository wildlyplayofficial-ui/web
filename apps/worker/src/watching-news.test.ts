import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNewsSlug, buildWatchingNewsPrompt, buildNewsPosts, buildPresencePosts, publishWatchingNews } from './watching-news';
import { disclosureFor, watchingDisclosureFor } from './recap';
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
    close_note: null,
    presence: false,
    ...overrides,
  };
}

const FOUR_SECTIONS = [
  '\u{1F1EC}\u{1F1E7}',
  '[META_TITLE] Mexico vs South Africa Preview - World Cup 2026',
  '[META_DESC] Preview of Mexico vs South Africa in the FIFA World Cup 2026 Group A opener at Estadio Azteca.',
  '[KEYWORD] Mexico vs South Africa preview',
  '',
  'Mexico host South Africa in the World Cup 2026 opener. AI-written — banhbong.net Newsroom',
  '',
  '\u{1F1FB}\u{1F1F3}',
  '[META_TITLE] Trước trận Mexico vs Nam Phi - World Cup 2026',
  '[META_DESC] Nhận định trước trận Mexico gặp Nam Phi tại bảng A World Cup 2026.',
  '[KEYWORD] Mexico vs Nam Phi nhận định',
  '',
  'Mexico đón tiếp Nam Phi trên sân nhà. AI-written — banhbong.net Newsroom',
  '',
  '\u{1F1F9}\u{1F1ED}',
  '[META_TITLE] พรีวิว เม็กซิโก vs แอฟริกาใต้ ฟุตบอลโลก 2026',
  '[META_DESC] วิเคราะห์ก่อนเกมเม็กซิโก พบ แอฟริกาใต้ ฟุตบอลโลก 2026 กลุ่มเอ',
  '[KEYWORD] เม็กซิโก vs แอฟริกาใต้ พรีวิว',
  '',
  'เม็กซิโกเปิดบ้านรับแอฟริกาใต้ AI-written — banhbong.net Newsroom',
  '',
  '\u{1F1EA}\u{1F1F8}',
  '[META_TITLE] Previa México vs Sudáfrica - Mundial 2026',
  '[META_DESC] Análisis previo del partido México contra Sudáfrica en el Grupo A del Mundial 2026.',
  '[KEYWORD] México vs Sudáfrica previa',
  '',
  'México recibe a Sudáfrica en el inicio del Mundial. AI-written — banhbong.net Newsroom',
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

  it('asks ONLY for the VI language section with meta fields (chỉ tiếng Việt)', () => {
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).not.toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).not.toContain('\u{1F1F9}\u{1F1ED}');
    expect(prompt).not.toContain('\u{1F1EA}\u{1F1F8}');
    expect(prompt).toContain('[META_TITLE]');
    expect(prompt).toContain('[META_DESC]');
    expect(prompt).toContain('[KEYWORD]');
  });

  it('asks for 400-600 words and neutral tone', () => {
    expect(prompt).toContain('400-600 words');
    expect(prompt).toContain('Neutral and informative');
  });

  it('instructs responsible language and the vi disclosure', () => {
    expect(prompt).toContain('"sure win"');
    expect(prompt).toContain(watchingDisclosureFor('vi'));
  });
});

describe('buildWatchingNewsPrompt — disclosure (Req 2: state-accurate footer)', () => {
  it('renders the watching (no-play) disclosure in vi — and ONLY vi, never "chose this play"', () => {
    const prompt = buildWatchingNewsPrompt(activeWatching({ author: 'curator' }));
    expect(prompt).toContain(watchingDisclosureFor('vi'));
    expect(prompt).not.toContain('chose this play');
    for (const lang of ['en', 'th', 'es'] as const) {
      expect(prompt).not.toContain(watchingDisclosureFor(lang));
    }
  });

  it('uses the same watching disclosure for scout watching prompts', () => {
    const prompt = buildWatchingNewsPrompt(activeWatching({ author: 'scout' }));
    expect(prompt).toContain(watchingDisclosureFor('vi'));
    expect(prompt).not.toContain(disclosureFor('real_human', 'vi'));
  });
});

describe('buildNewsPosts', () => {
  it('builds a single vi post with meta fields when split succeeds — even from a 4-section response', () => {
    const posts = buildNewsPosts(activeWatching(), FOUR_SECTIONS);
    expect(posts.map((p) => p.lang)).toEqual(['vi']);

    expect(posts[0]).toMatchObject({
      type: 'analysis',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      lang: 'vi',
      title: 'Trước trận Mexico vs Nam Phi - World Cup 2026',
      meta_title: 'Trước trận Mexico vs Nam Phi - World Cup 2026',
      meta_description: expect.stringContaining('Nhận định trước trận'),
      target_keyword: 'Mexico vs Nam Phi nhận định',
      pick_ids: [],
      status: 'published',
    });
    expect(posts[0].body_md).toContain('Mexico đón tiếp Nam Phi');
    expect(posts[0].published_at).toBeTruthy();
  });

  it('falls back to a single vi row when the split fails', () => {
    const posts = buildNewsPosts(activeWatching(), '  no flags here  ');
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: 'analysis',
      lang: 'vi',
      body_md: 'no flags here',
      meta_title: null,
      meta_description: null,
      target_keyword: null,
    });
  });
});

describe('buildPresencePosts (Req 1: watch-lite minimal render)', () => {
  it('builds a single vi post with the note verbatim and vi watching disclosure', () => {
    const posts = buildPresencePosts(activeWatching({ presence: true }));
    expect(posts.map((p) => p.lang)).toEqual(['vi']);
    expect(posts[0]).toMatchObject({
      type: 'analysis',
      lang: 'vi',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      pick_ids: [],
      status: 'published',
    });
    // Chưa có bản dịch → note EN verbatim (bản dịch đến sau qua propagateNoteToPresencePosts)
    expect(posts[0].body_md).toContain('Mexico dominant at home');
    expect(posts[0].body_md).toContain(watchingDisclosureFor('vi'));
    // Must NOT contain full-preview sections
    expect(posts[0].body_md).not.toContain('Tactical');
    expect(posts[0].body_md).not.toContain('Key Players');
  });

  it('uses the vi fallback when note is empty', () => {
    const posts = buildPresencePosts(activeWatching({ presence: true, note: null }));
    expect(posts[0].body_md).toContain('Trận đấu nằm trong danh sách theo dõi của chúng tôi.');
  });

  it('uses translated note when available', () => {
    const posts = buildPresencePosts(activeWatching({
      presence: true,
      note_translations: { vi: 'VI note' },
    }));
    expect(posts[0].body_md).toContain('VI note');
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

    expect(store.posts.map((p) => p.lang)).toEqual(['vi']);
    expect(store.posts[0]).toMatchObject({
      type: 'analysis',
      slug: 'news-mexico-vs-south-africa-2026-06-11',
      lang: 'vi',
    });
  });

  it('skips when slug already exists (dedup)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();
    // Pre-populate with existing slug (type must match 'analysis' — the slug lookup checks this type)
    await store.insertPost({
      type: 'analysis',
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

  it('presence cards skip AI and publish minimal posts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();

    await publishWatchingNews(
      { store, env: { apiKey: 'k' } },
      activeWatching({ presence: true }),
    );

    // Should NOT call Claude
    expect(fetchMock).not.toHaveBeenCalled();
    // Should still publish the vi post
    expect(store.posts.map((p) => p.lang)).toEqual(['vi']);
    expect(store.posts[0].body_md).toContain('Mexico dominant at home');
    expect(store.posts[0].body_md).toContain(watchingDisclosureFor('vi'));
  });

  it('presence cards work even without an API key', async () => {
    const store = new MemoryStore();
    await publishWatchingNews(
      { store, env: { apiKey: undefined } },
      activeWatching({ presence: true }),
    );
    expect(store.posts).toHaveLength(1);
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

  // Regression: France-Morocco 09/07 — per-lang resilience loop giữ nguyên;
  // với NGON_NGU = ['vi'] bài chỉ còn dòng vi.
  it('publishes exactly the vi row through the per-lang loop', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();

    await publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching());

    expect(store.posts.map((p) => p.lang).sort()).toEqual(['vi']);
  });

  it('REQ 4: presence posts can be deleted by slug on unwatch', async () => {
    const store = new MemoryStore();

    await publishWatchingNews(
      { store, env: { apiKey: undefined } },
      activeWatching({ presence: true }),
    );
    expect(store.posts).toHaveLength(1);

    // Simulate unwatch: delete posts by slug
    const slug = buildNewsSlug('Mexico', 'South Africa', '2026-06-11T19:00:00.000Z');
    const deleted = await store.deletePostsBySlug(slug);
    expect(deleted).toBe(1);
    expect(store.posts).toHaveLength(0);
  });

  it('REQ 4: deep-gate watching posts are NOT deleted (scope guard)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();

    // Publish a deep-gate (presence=false) watching article
    await publishWatchingNews(
      { store, env: { apiKey: 'k' } },
      activeWatching({ presence: false }),
    );
    expect(store.posts).toHaveLength(1);

    // Expire the watching — since presence=false, posts should NOT be deleted
    const row = await store.insertWatching({
      home_team: 'Mexico', away_team: 'South Africa',
      league: 'FIFA World Cup 2026 — Group A',
      kickoff_utc: '2026-06-11T19:00:00.000Z',
      note: 'note', status: 'active', pick_id: null,
      presence: false,
    });
    const expired = await store.expireWatching(row.id);

    // The scope guard: NOT a presence card → do NOT delete posts
    expect(expired.presence).toBe(false);
    expect(store.posts).toHaveLength(1); // posts still intact
  });

  it('publishes nothing when EVERY lang is blocked', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    store.insertPost = vi.fn(async () => { throw new Error('seo-lint BLOCK'); });

    await publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching());

    expect(store.posts).toHaveLength(0);
  });

  // Nick 21/8: /watching is web-only — only /pick and /void reach TG + FB.
  it('never posts to Telegram or Facebook', async () => {
    const fbCalls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('graph.facebook.com')) {
        fbCalls.push(String(url));
        return { ok: true, status: 200, json: async () => ({ id: 'fb-1' }) };
      }
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }) };
    }));
    const store = new MemoryStore();

    await publishWatchingNews({ store, env: { apiKey: 'k' } }, activeWatching());

    expect(store.posts).toHaveLength(1);
    expect(fbCalls).toHaveLength(0);
  });
});
