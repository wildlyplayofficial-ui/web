import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBuzzPrompt, generateBuzz, parseBuzzResponse, runBuzzCycle } from './buzz';
import { MemoryStore, type WatchingRow } from './store';

function activeWatching(overrides: Partial<WatchingRow> = {}): WatchingRow {
  return {
    id: 'w-1',
    home_team: 'Brazil',
    away_team: 'Germany',
    league: 'FIFA World Cup 2026 — Group F',
    kickoff_utc: '2026-06-20T18:00:00.000Z',
    note: 'Classic rivalry, both teams in good form',
    note_translations: null,
    status: 'active',
    created_at: '2026-06-20T10:00:00.000Z',
    pick_id: null,
    buzz_history: [],
    author: 'curator',
    ...overrides,
  };
}

const VALID_RESPONSE = JSON.stringify({
  sentiment_pct: 62,
  lean_label: {
    en: 'Brazil slight favorites',
    vi: 'Brazil nhỉnh hơn',
    th: 'บราซิลเต็ง',
    es: 'Brasil ligero favorito',
  },
  themes: {
    en: ['Home crowd advantage', 'Neymar fitness concerns', 'Germany defensive weakness'],
    vi: ['Lợi thế sân nhà', 'Neymar lo ngại thể lực', 'Hàng thủ Đức yếu'],
    th: ['ได้เปรียบเจ้าบ้าน', 'เนย์มาร์ความฟิต', 'เยอรมันรับอ่อน'],
    es: ['Ventaja local', 'Preocupación fitness Neymar', 'Debilidad defensiva alemana'],
  },
  confidence: 'high',
});

describe('buildBuzzPrompt', () => {
  const prompt = buildBuzzPrompt(activeWatching());

  it('includes match details', () => {
    expect(prompt).toContain('Brazil vs Germany');
    expect(prompt).toContain('FIFA World Cup 2026');
  });

  it('includes the curator note when present', () => {
    expect(prompt).toContain('Classic rivalry');
  });

  it('asks for JSON output', () => {
    expect(prompt).toContain('sentiment_pct');
    expect(prompt).toContain('lean_label');
    expect(prompt).toContain('themes');
  });

  it('enforces responsible language', () => {
    expect(prompt).toContain('NEVER use "sure win"');
  });
});

describe('parseBuzzResponse', () => {
  it('parses a valid JSON response', () => {
    const result = parseBuzzResponse(VALID_RESPONSE);
    expect(result).not.toBeNull();
    expect(result!.sentiment_pct).toBe(62);
    expect(result!.lean_label.en).toBe('Brazil slight favorites');
    expect(result!.themes.en).toHaveLength(3);
    expect(result!.confidence).toBe('high');
  });

  it('handles markdown-fenced JSON', () => {
    const fenced = '```json\n' + VALID_RESPONSE + '\n```';
    const result = parseBuzzResponse(fenced);
    expect(result).not.toBeNull();
    expect(result!.sentiment_pct).toBe(62);
  });

  it('returns null for invalid JSON', () => {
    expect(parseBuzzResponse('not json')).toBeNull();
  });

  it('returns null for out-of-range sentiment_pct', () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_RESPONSE), sentiment_pct: 150 });
    expect(parseBuzzResponse(bad)).toBeNull();
  });

  it('returns null for missing language in lean_label', () => {
    const parsed = JSON.parse(VALID_RESPONSE);
    delete parsed.lean_label.th;
    expect(parseBuzzResponse(JSON.stringify(parsed))).toBeNull();
  });

  it('returns null for invalid confidence value', () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_RESPONSE), confidence: 'maybe' });
    expect(parseBuzzResponse(bad)).toBeNull();
  });
});

describe('generateBuzz', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a BuzzSnapshot on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: VALID_RESPONSE }] }),
    })));

    const store = new MemoryStore();
    const result = await generateBuzz(
      { store, env: { apiKey: 'k' } },
      activeWatching(),
    );

    expect(result).not.toBeNull();
    expect(result!.sentiment_pct).toBe(62);
    expect(result!.timestamp).toBeDefined();
  });

  it('returns null without an API key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const store = new MemoryStore();
    const result = await generateBuzz(
      { store, env: { apiKey: undefined } },
      activeWatching(),
    );

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('runBuzzCycle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('generates buzz for active watching rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: VALID_RESPONSE }] }),
    })));

    const store = new MemoryStore();
    await store.insertWatching({
      home_team: 'Brazil',
      away_team: 'Germany',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-20T18:00:00.000Z',
      note: 'test',
      status: 'active',
      pick_id: null,
    });

    const updated = await runBuzzCycle({ store, env: { apiKey: 'k' } });
    expect(updated).toBe(1);

    const active = await store.getActiveWatching();
    expect((active[0] as any).buzz_history).toHaveLength(1);
  });

  it('skips when last buzz was < 2h ago', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: VALID_RESPONSE }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const store = new MemoryStore();
    const row = await store.insertWatching({
      home_team: 'Brazil',
      away_team: 'Germany',
      league: 'FIFA World Cup 2026',
      kickoff_utc: '2026-06-20T18:00:00.000Z',
      note: 'test',
      status: 'active',
      pick_id: null,
    });
    // Simulate a recent buzz
    await store.updateWatching(row.id, {
      buzz_history: [{
        timestamp: new Date().toISOString(),
        sentiment_pct: 55,
        lean_label: { en: 'Even', vi: 'Đều', th: 'เท่า', es: 'Parejo' },
        themes: { en: ['a'], vi: ['b'], th: ['c'], es: ['d'] },
        confidence: 'medium',
      }],
    });

    const updated = await runBuzzCycle({ store, env: { apiKey: 'k' } });
    expect(updated).toBe(0);
  });
});
