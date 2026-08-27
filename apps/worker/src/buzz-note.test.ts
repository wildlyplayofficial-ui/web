import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNoteTranslationPrompt, parseNoteTranslations, translateWatchingNote, propagateNoteToPresencePosts } from './buzz-note';
import { watchingDisclosureFor } from './recap';
import { buildPresencePosts } from './watching-news';
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
  '\u{1F1EC}\u{1F1E7} Mexico dominant at home, visitors missing key players',
  '\u{1F1FB}\u{1F1F3} Mexico áp đảo sân nhà, đội khách thiếu cầu thủ chủ chốt',
  '\u{1F1F9}\u{1F1ED} เม็กซิโกเหนือกว่าในบ้าน ทีมเยือนขาดผู้เล่นตัวหลัก',
  '\u{1F1EA}\u{1F1F8} México dominante en casa, visitantes sin jugadores clave',
].join('\n\n');

describe('buildNoteTranslationPrompt', () => {
  const prompt = buildNoteTranslationPrompt(activeWatching());

  it('includes the match and note', () => {
    expect(prompt).toContain('Mexico vs South Africa');
    expect(prompt).toContain('Mexico dominant at home');
  });

  it('asks ONLY for the VI flag section (chỉ tiếng Việt, Peter 27/8)', () => {
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).not.toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).not.toContain('\u{1F1F9}\u{1F1ED}');
    expect(prompt).not.toContain('\u{1F1EA}\u{1F1F8}');
  });
});

describe('parseNoteTranslations', () => {
  it('parses a 4-section response into a vi-only record', () => {
    const result = parseNoteTranslations(FOUR_SECTIONS);
    expect(result).not.toBeNull();
    expect(result!.vi).toContain('áp đảo');
    expect(Object.keys(result!)).toEqual(['vi']);
  });

  it('returns null on garbage input', () => {
    expect(parseNoteTranslations('no flags anywhere')).toBeNull();
  });

  it('returns null when the VI section is missing', () => {
    expect(parseNoteTranslations('\u{1F1EC}\u{1F1E7} English only')).toBeNull();
  });

  it('accepts a VI-only response (EN echo no longer required)', () => {
    const result = parseNoteTranslations('\u{1F1FB}\u{1F1F3} Tiếng Việt');
    expect(result).toEqual({ vi: 'Tiếng Việt' });
  });
});

describe('translateWatchingNote', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('translates and stores the note_translations', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    const row = await store.insertWatching({
      home_team: 'Mexico',
      away_team: 'South Africa',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-11T19:00:00.000Z',
      note: 'Mexico dominant at home, visitors missing key players',
      status: 'active',
      pick_id: null,
    });

    await translateWatchingNote({ store, env: { apiKey: 'k' } }, row);

    const updated = store.watchings.get(row.id)!;
    expect(updated.note_translations).not.toBeNull();
    expect(updated.note_translations!.vi).toContain('áp đảo');
    expect(updated.note_translations!.en).toBeUndefined(); // chỉ tiếng Việt
  });

  it('does nothing when note is null', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new MemoryStore();
    const row = await store.insertWatching({
      home_team: 'Mexico',
      away_team: 'South Africa',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-11T19:00:00.000Z',
      note: null,
      status: 'active',
      pick_id: null,
    });

    await translateWatchingNote({ store, env: { apiKey: 'k' } }, row);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when store update fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    const row = await store.insertWatching({
      home_team: 'Mexico',
      away_team: 'South Africa',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-11T19:00:00.000Z',
      note: 'Some note',
      status: 'active',
      pick_id: null,
    });
    store.updateWatching = vi.fn(async () => { throw new Error('db down'); });

    await expect(
      translateWatchingNote({ store, env: { apiKey: 'k' } }, row),
    ).resolves.toBeUndefined();
  });

  it('REQ 5: propagates translations into presence posts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: FOUR_SECTIONS }] }),
    })));
    const store = new MemoryStore();
    const row = await store.insertWatching({
      home_team: 'Mexico',
      away_team: 'South Africa',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-11T19:00:00.000Z',
      note: 'Mexico dominant at home, visitors missing key players',
      status: 'active',
      pick_id: null,
      presence: true,
    });

    // Simulate: presence posts already published with verbatim EN note
    const presencePosts = buildPresencePosts(row as unknown as WatchingRow);
    for (const post of presencePosts) await store.insertPost(post);
    expect(store.posts[0].body_md).toContain('Mexico dominant at home'); // VI has EN note verbatim

    await translateWatchingNote({ store, env: { apiKey: 'k' } }, row as unknown as WatchingRow);

    // After translation, VI post should now have Vietnamese text
    const viPost = store.posts.find(p => p.lang === 'vi');
    expect(viPost!.body_md).toContain('áp đảo');
    expect(viPost!.body_md).toContain(watchingDisclosureFor('vi'));
  });
});

describe('propagateNoteToPresencePosts (REQ 5)', () => {
  it('updates the vi post with translated note + footer', async () => {
    const store = new MemoryStore();
    const w = activeWatching({ presence: true });

    // Pre-populate presence posts
    const posts = buildPresencePosts(w);
    for (const p of posts) await store.insertPost(p);

    const translations = { vi: 'Ghi chú tiếng Việt' };

    await propagateNoteToPresencePosts(store, w, translations);

    const post = store.posts.find(p => p.lang === 'vi');
    expect(post!.body_md).toContain(translations.vi);
    expect(post!.body_md).toContain(watchingDisclosureFor('vi'));
  });
});
