import { describe, expect, it, vi } from 'vitest';
import { getFinalScore } from './scores';
import { log } from './log';

vi.mock('./log');

describe('getFinalScore — 90-minute regulation score (periods["ft"])', () => {
  it('returns periods["ft"] when available (90-min regulation)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'finished',
        periods: {
          ft: { home: 1, away: 1 },
        },
        scores: { home: 2, away: 1 }, // Final with ET/penalty
      }),
    });
    global.fetch = mockFetch;

    const score = await getFinalScore(12345, 'test-key');

    expect(score).toEqual({ home: 1, away: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.odds-api.io/v3/events/12345?apiKey=test-key',
    );
  });

  it('logs when regulation differs from final (ET/penalty detected)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'finished',
        periods: {
          ft: { home: 1, away: 1 },
        },
        scores: { home: 2, away: 1 }, // Final with ET goal
      }),
    });
    global.fetch = mockFetch;

    const score = await getFinalScore(12345, 'test-key');

    expect(score).toEqual({ home: 1, away: 1 });
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('regulation 1-1 differs from final 2-1'),
    );
  });

  it('falls back to top-level score if periods["ft"] missing, logs warning', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'finished',
        periods: {}, // ft missing
        scores: { home: 2, away: 1 },
      }),
    });
    global.fetch = mockFetch;

    const score = await getFinalScore(12345, 'test-key');

    expect(score).toEqual({ home: 2, away: 1 });
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('periods["ft"] missing'),
      expect.any(String),
    );
  });

  it('returns null if event not finished', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'live',
        periods: {},
        scores: { home: 1, away: 0 },
      }),
    });
    global.fetch = mockFetch;

    const score = await getFinalScore(12345, 'test-key');

    expect(score).toBeNull();
  });

  it('falls back to top-level score if regulation score unreadable', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'finished',
        periods: {
          ft: { home: null, away: 1 },
        },
        scores: { home: 1, away: 1 },
      }),
    });
    global.fetch = mockFetch;

    const score = await getFinalScore(12345, 'test-key');

    expect(score).toEqual({ home: 1, away: 1 });
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('periods["ft"] missing'),
      expect.any(String),
    );
  });

  it('throws on HTTP error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch;

    await expect(getFinalScore(12345, 'test-key')).rejects.toThrow(/odds-api returned 500/);
  });
});
