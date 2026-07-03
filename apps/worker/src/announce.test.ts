import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  announceResult,
  formatResultMessage,
  formatUnits,
  summarizeRecord,
  type AnnounceDeps,
} from './announce';
import { MemoryStore, type NewPick, type PickRow } from './store';

function settledPick(overrides: Partial<NewPick> = {}): NewPick {
  return {
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
    thesis: 'test thesis',
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
    status: 'won',
    published_at: '2026-06-11T08:00:00.000Z',
    home_score: 3,
    away_score: 0,
    raw_outcome: 'win',
    units_pl: 1.05,
    settled_at: '2026-06-11T21:00:00.000Z',
    ...overrides,
  };
}

/** Card text as announceResult builds it: record computed over the store's settled picks. */
function expectedText(pick: PickRow): string {
  return formatResultMessage(pick, summarizeRecord([pick]));
}

function fakeApi() {
  let nextId = 100;
  return {
    sendMessage: vi.fn(async () => ({ message_id: nextId++ })),
    sendPhoto: vi.fn(async () => ({ message_id: nextId++ })),
  };
}

const CHANNEL = '-100123';

describe('formatResultMessage — SETTLED card (Post Restructure v1 §2.3)', () => {
  it('leads with the badge, pick block, FT score and units', () => {
    const pick = { ...settledPick(), id: 'p1' } as PickRow;
    const text = formatResultMessage(pick);
    expect(text).toContain('\u2705 WIN | Mexico -1.25 -1.25 @ 2.05 \u2192 FT 3-0 \u00b7 +1.05u');
    expect(text).toContain('Not financial advice');
    expect(text).not.toContain('Record:');
  });

  it('adds the record line when a summary is provided', () => {
    const pick = { ...settledPick(), id: 'p1' } as PickRow;
    const text = formatResultMessage(pick, { wins: 3, losses: 1, pushes: 1, units: 2.35 });
    expect(text).toContain('\u{1F4CA} Record: 3-1-1 \u00b7 +2.35u');
  });

  it('marks half wins and losses next to the badge', () => {
    const pick = { ...settledPick({ raw_outcome: 'half_win', units_pl: 0.53 }), id: 'p1' } as PickRow;
    expect(formatResultMessage(pick)).toContain('\u2705\u00bd HALF-WIN |');
  });

  it('formats units with sign', () => {
    expect(formatUnits(1.049999)).toBe('+1.05u');
    expect(formatUnits(-1)).toBe('-1u');
    expect(formatUnits(0)).toBe('0u');
  });
});

describe('announceResult — R6: recap is web-only, one TG notification', () => {
  it('sends exactly one channel message and publishes the recap as posts only', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () => 'recap text EN + VI');

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap },
      pick,
    );

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, expectedText(pick));
    expect(recap).toHaveBeenCalledWith(pick);
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ pick_id: pick.id, channel: 'telegram', external_id: '100', ok: true });
    expect(store.posts).toHaveLength(1); // recap published web-only
  });

  it('posts only the result when the recap returns null', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap: async () => null },
      pick,
    );

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0].detail).toBe(`result won 1.05u`);
    expect(store.posts).toHaveLength(0);
  });

  it('posts only the result when no recap fn is provided', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();

    await announceResult({ api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store }, pick);

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.logs).toHaveLength(1);
  });

  it('publishes en + vi posts rows on a successful bilingual recap (decision #19)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () =>
      '\u{1F1EC}\u{1F1E7} Hosts cruised.\n\n\u{1F1FB}\u{1F1F3} Chủ nhà thắng dễ.');

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap },
      pick,
    );

    expect(store.posts).toHaveLength(2);
    expect(store.posts[0]).toMatchObject({
      type: 'recap', slug: 'recap-mexico-vs-south-africa-3-0', lang: 'en', status: 'published',
      pick_ids: [pick.id], body_md: 'Hosts cruised.',
    });
    expect(store.posts[0].published_at).toBeTruthy();
    expect(store.posts[1]).toMatchObject({ lang: 'vi', status: 'published', body_md: 'Chủ nhà thắng dễ.' });
  });

  it('uses the long-form article for posts when recapArticle delivers — no extra channel message', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () => 'short channel recap');
    const recapArticle = vi.fn(async () =>
      '\u{1F1EC}\u{1F1E7} Long article EN.\n\n\u{1F1FB}\u{1F1F3} Bài dài VI.');

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap, recapArticle },
      pick,
    );

    expect(api.sendMessage).toHaveBeenCalledTimes(1); // the result card only
    expect(recapArticle).toHaveBeenCalledWith(pick);
    expect(store.posts).toHaveLength(2);
    expect(store.posts[0]).toMatchObject({ lang: 'en', body_md: 'Long article EN.', status: 'published' });
    expect(store.posts[1]).toMatchObject({ lang: 'vi', body_md: 'Bài dài VI.' });
  });

  it('falls back to the channel recap text for posts when recapArticle returns null', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () => 'short channel recap');
    const recapArticle = vi.fn(async () => null);

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap, recapArticle },
      pick,
    );

    expect(store.posts).toHaveLength(1); // no flags in fallback text → single en row
    expect(store.posts[0]).toMatchObject({ lang: 'en', body_md: 'short channel recap', status: 'published' });
  });

  it('still announces the result when insertPost throws — storage must never break it', async () => {
    const store = new MemoryStore();
    store.insertPost = vi.fn(async () => { throw new Error('posts table down'); });
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () => 'recap text EN + VI');

    await expect(announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap },
      pick,
    )).resolves.toBeUndefined();

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.logs).toHaveLength(1);
    expect(store.posts).toHaveLength(0);
  });

  it('does not throw when the recap fn throws — the result is already announced', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () => { throw new Error('recap exploded'); });

    await expect(announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap },
      pick,
    )).resolves.toBeUndefined();

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.logs).toHaveLength(1);
  });
});

describe('announceResult — image chain + Facebook (Post Restructure v1 §2.6)', () => {
  const SITE = 'https://www.wildlyplay.com';
  const FB = { pageId: '120', pageToken: 'tok' };

  afterEach(() => vi.unstubAllGlobals());

  it('sends the OG settled card with the text as caption when siteUrl is set', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE },
      pick,
    );

    expect(api.sendPhoto).toHaveBeenCalledWith(
      CHANNEL, `${SITE}/api/og/play/${pick.id}`, { caption: expectedText(pick) });
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.logs[0].detail).toBe('result won 1.05u (card)');
  });

  it('falls back to the branded W/L/P banner when the OG card fails', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    api.sendPhoto.mockRejectedValueOnce(new Error('card 404'));

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE },
      pick,
    );

    expect(api.sendPhoto).toHaveBeenNthCalledWith(
      2, CHANNEL, `${SITE}/images/wildlyplay_settled_win.png`, { caption: expectedText(pick) });
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.logs[0].detail).toBe('result won 1.05u (banner)');
  });

  it('falls back to plain text when both images fail — never text-less', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    api.sendPhoto.mockRejectedValue(new Error('images down'));

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE },
      pick,
    );

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, expectedText(pick));
    expect(store.logs[0].detail).toBe('result won 1.05u'); // no suffix
  });

  it('posts the branded banner to Facebook and logs it', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'fb_photo_1' })));
    vi.stubGlobal('fetch', fetchMock);

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB },
      pick,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.facebook.com/v19.0/${FB.pageId}/photos`, expect.anything());
    expect(store.logs).toHaveLength(2);
    expect(store.logs[1]).toMatchObject({ channel: 'facebook', external_id: 'fb_photo_1', ok: true, detail: 'result won' });
  });

  it('FB photo failure falls back to a link post; both failing never throws', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'bad image' } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'fb_link_1' })));
    vi.stubGlobal('fetch', fetchMock);

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB },
      pick,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.logs[1]).toMatchObject({ channel: 'facebook', external_id: 'fb_link_1', ok: true });

    // Both FB attempts down → channel announce already logged, no throw.
    const pick2 = await store.insertPick(settledPick());
    fetchMock.mockRejectedValue(new Error('graph down'));
    await expect(announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB },
      pick2,
    )).resolves.toBeUndefined();
    expect(store.logs.filter((l) => l.pick_id === pick2.id)).toHaveLength(1); // telegram only
  });
});
