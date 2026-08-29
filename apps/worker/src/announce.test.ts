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
    author: 'curator',
    ...overrides,
  };
}

/** Chữ thẻ đúng như announceResult dựng cho TELEGRAM: bản in đậm, kèm link recap. */
function expectedText(pick: PickRow, siteUrl?: string): string {
  return formatResultMessage(pick, siteUrl, true);
}
const TG_OPTS = { parse_mode: 'HTML' as const };

function fakeApi() {
  let nextId = 100;
  return {
    sendMessage: vi.fn(async () => ({ message_id: nextId++ })),
    sendPhoto: vi.fn(async () => ({ message_id: nextId++ })),
  };
}

const CHANNEL = '-100123';
const SITE = 'https://www.banhbong.net';

describe('formatResultMessage — SETTLED card (Post Restructure v1 §2.3)', () => {
  it('leads with the badge, pick block, FT score and units', () => {
    const pick = { ...settledPick(), id: 'p1' } as PickRow;
    const text = formatResultMessage(pick);
    expect(text).toContain('NHẬN ĐỊNH ĐÚNG — Mexico vs South Africa');
    expect(text).toContain('Mexico -1.25 · Kết quả: 3-0');
    // Nick 29/8: bỏ hẳn dòng công bố và dòng thành tích khỏi thẻ kết quả.
    expect(text).not.toContain('Chỉ mang tính tham khảo');
    expect(text).not.toContain('Thành tích');
    expect(text).not.toContain('@ 2.05'); // VI-safe: no odds
  });

  it('kèm link recap khi có siteUrl, bỏ qua khi không có (Nick 29/8)', () => {
    const pick = { ...settledPick(), id: 'p1' } as PickRow;
    const co = formatResultMessage(pick, SITE);
    expect(co).toContain(`Xem lại trận: ${SITE}/analysis/recap-mexico-vs-south-africa-3-0`);
    expect(formatResultMessage(pick)).not.toContain('Xem lại trận');
  });

  it('in đậm hai dòng chính khi gửi Telegram, chữ thường cho Facebook (Nick 29/8)', () => {
    const pick = { ...settledPick(), id: 'p1' } as PickRow;
    const tg = formatResultMessage(pick, SITE, true);
    const fb = formatResultMessage(pick, SITE, false);
    expect(tg).toContain('<b>NHẬN ĐỊNH ĐÚNG — Mexico vs South Africa</b>');
    expect(tg).toContain('<b>Mexico -1.25 · Kết quả: 3-0</b>');
    expect(fb).not.toContain('<b>');
    expect(fb).toContain('NHẬN ĐỊNH ĐÚNG — Mexico vs South Africa');
  });

  it('marks half wins and losses next to the badge', () => {
    const pick = { ...settledPick({ raw_outcome: 'half_win', units_pl: 0.53 }), id: 'p1' } as PickRow;
    expect(formatResultMessage(pick)).toContain('NHẬN ĐỊNH ĐÚNG —');
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
    // deps không có siteUrl → thẻ không kèm link recap
    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, expectedText(pick), TG_OPTS);
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

  it('publishes a single vi posts row on a successful bilingual recap (chỉ tiếng Việt)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const recap = vi.fn(async () =>
      '\u{1F1EC}\u{1F1E7} Hosts cruised.\n\n\u{1F1FB}\u{1F1F3} Chủ nhà thắng dễ.');

    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, recap },
      pick,
    );

    expect(store.posts).toHaveLength(1);
    expect(store.posts[0]).toMatchObject({
      type: 'recap', slug: 'recap-mexico-vs-south-africa-3-0', lang: 'vi', status: 'published',
      pick_ids: [pick.id], body_md: 'Chủ nhà thắng dễ.',
    });
    expect(store.posts[0].published_at).toBeTruthy();
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
    expect(store.posts).toHaveLength(1);
    expect(store.posts[0]).toMatchObject({ lang: 'vi', body_md: 'Bài dài VI.', status: 'published' });
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

    expect(store.posts).toHaveLength(1); // no flags in fallback text → single vi row
    expect(store.posts[0]).toMatchObject({ lang: 'vi', body_md: 'short channel recap', status: 'published' });
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

    // c0eb1c5 (#118, 22/8): resultCardUrl phải kèm ?lang=vi — thiếu nó card đăng bản
    // tiếng Anh (+ bản CDN cũ), Jane bắt live trên /score Hull vs MU. Test cập nhật theo.
    expect(api.sendPhoto).toHaveBeenCalledWith(
      CHANNEL, `${SITE}/api/og/play/${pick.id}?lang=vi`, { caption: expectedText(pick, SITE), ...TG_OPTS });
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
      2, CHANNEL, `${SITE}/images/banhbong_settled_win.png`, { caption: expectedText(pick, SITE), ...TG_OPTS });
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

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, expectedText(pick, SITE), TG_OPTS);
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

describe('ảnh bài Facebook (Peter 29/8)', () => {
  it('Facebook dùng THẺ TRẬN, không dùng băng-rôn chung', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(settledPick());
    const api = fakeApi();
    const anh: string[] = [];
    const fetchCu = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (u: string, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      const m = body.match(/"url":"([^"]+)"/);
      if (m) anh.push(m[1]);
      return { ok: true, json: async () => ({ id: 'fb1' }) } as unknown as Response;
    }));
    await announceResult(
      { api: api as unknown as AnnounceDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE,
        facebook: { pageId: 'p', pageToken: 't' } },
      pick,
    );
    vi.stubGlobal('fetch', fetchCu);
    expect(anh[0]).toBe(`${SITE}/api/og/play/${pick.id}?lang=vi`);
    expect(anh[0]).not.toContain('banhbong_settled_win');
  });
});
