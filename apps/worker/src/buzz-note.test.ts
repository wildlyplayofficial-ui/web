import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNoteTranslationPrompt, parseNoteTranslations, translateWatchingNote } from './buzz-note';
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

  it('asks for four flag sections', () => {
    expect(prompt).toContain('\u{1F1EC}\u{1F1E7}');
    expect(prompt).toContain('\u{1F1FB}\u{1F1F3}');
    expect(prompt).toContain('\u{1F1F9}\u{1F1ED}');
    expect(prompt).toContain('\u{1F1EA}\u{1F1F8}');
  });
});

describe('parseNoteTranslations', () => {
  it('parses 4 sections into a lang record', () => {
    const result = parseNoteTranslations(FOUR_SECTIONS);
    expect(result).not.toBeNull();
    expect(result!.en).toContain('Mexico dominant');
    expect(result!.vi).toContain('áp đảo');
    expect(result!.th).toContain('เม็กซิโก');
    expect(result!.es).toContain('México dominante');
  });

  it('returns null on garbage input', () => {
    expect(parseNoteTranslations('no flags anywhere')).toBeNull();
  });

  it('returns null when a language is missing', () => {
    const partial = [
      '\u{1F1EC}\u{1F1E7} English only',
      '\u{1F1FB}\u{1F1F3} Tiếng Việt',
    ].join('\n\n');
    expect(parseNoteTranslations(partial)).toBeNull();
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
    expect(updated.note_translations!.en).toContain('Mexico dominant');
    expect(updated.note_translations!.vi).toContain('áp đảo');
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
});
