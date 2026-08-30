import { afterEach, describe, expect, it, vi } from 'vitest';
import { announcePick, announceVoid, formatPickMessage, formatVoidMessage, postToFacebook, type AnnouncePickDeps } from './announce-pick';
import { MemoryStore, type NewPick } from './store';

function publishedPick(overrides: Partial<NewPick> = {}): NewPick {
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

function fakeApi() {
  let nextId = 100;
  return { sendMessage: vi.fn(async () => ({ message_id: nextId++ })) };
}

const CHANNEL = '-100123';
const SITE = 'https://beta.banhbong.net';
const FB = { pageId: '111', pageToken: 'tok' };

afterEach(() => vi.unstubAllGlobals());

describe('formatPickMessage — 3-second card (Post Restructure v1 §2.1)', () => {
  it('renders only the hook + link — thẻ hình mang phần còn lại (Nick 21/8; Peter 29/8 bỏ dòng công bố)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const msg = formatPickMessage(pick, SITE);
    expect(msg).toContain(`${SITE}/play/mexico-vs-south-africa-mexico-1-25-2026-06-11`);
    expect(msg).toContain('Nhận định chi tiết');
    // Peter 29/8: bỏ hẳn dòng công bố khỏi caption pick (thông báo KẾT QUẢ vẫn giữ).
    expect(msg).not.toContain('Chỉ mang tính tham khảo');
    // caption KHÔNG lặp thông tin đã có trên thẻ hình
    expect(msg).not.toContain('Mexico vs South Africa');
    expect(msg).not.toContain('Mức tự tin');
    expect(msg).not.toContain('@ 2.05');
    expect(msg).not.toContain('test thesis');
  });

  it('renders the hand-written hook untouched and omits the line when absent (R5)', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const hook = 'Swiss press suffocates deep blocks — market slept on it.';
    expect(formatPickMessage(pick, SITE, { hook })).toContain(`\u{1F4DD} ${hook}`);
    expect(formatPickMessage(pick, SITE)).not.toContain('\u{1F4DD}');
  });
});

describe('formatVoidMessage', () => {
  it('says the play was voided before kickoff and does not count', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const msg = formatVoidMessage(pick, SITE);
    expect(msg).toContain('HỦY NHẬN ĐỊNH');
    expect(msg).toContain('Mexico vs South Africa');
    expect(msg).toContain('Huỷ trước giờ đá — không tính vào thành tích.');
    expect(msg).not.toContain('@ 2.05'); // VI-safe: no odds in void card
    expect(msg).toContain(`${SITE}/play/${pick.id}`);
  });
});

describe('announceVoid', () => {
  it('posts the void notice to channel + FB with detail "void announce"', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_444' }), { status: 200 })));

    await announceVoid({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, formatVoidMessage(pick, SITE), { parse_mode: 'HTML' });
    expect(store.logs).toHaveLength(2);
    expect(store.logs[0]).toMatchObject({ pick_id: pick.id, channel: 'telegram', ok: true, detail: 'void announce' });
    expect(store.logs[1]).toMatchObject({ pick_id: pick.id, channel: 'facebook', external_id: '111_444', ok: true, detail: 'void announce' });
  });

  it('never throws when both channel and FB fail', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick({ status: 'void' }));
    const api = { sendMessage: vi.fn(async () => { throw new Error('tg down'); }) };
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    await announceVoid({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(0);
  });
});

describe('postToFacebook', () => {
  it('posts to the page feed and returns the post id', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const id = await postToFacebook(FB, 'hello', `${SITE}/play/x`);
    expect(id).toBe('111_222');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v19.0/111/feed');
    expect(JSON.parse(String(init.body))).toMatchObject({ message: 'hello', link: `${SITE}/play/x`, access_token: 'tok' });
  });

  it('throws on a Graph API error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'bad token' } }), { status: 400 })));
    await expect(postToFacebook(FB, 'hello', 'link')).rejects.toThrow('bad token');
  });
});

describe('announcePick', () => {
  it('posts to the channel + FB and logs both in channel_log', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(api.sendMessage).toHaveBeenCalledWith(CHANNEL, formatPickMessage(pick, SITE, {}, true), { parse_mode: 'HTML' });
    expect(store.logs).toHaveLength(2);
    expect(store.logs[0]).toMatchObject({ pick_id: pick.id, channel: 'telegram', external_id: '100', ok: true, detail: 'pick announce' });
    expect(store.logs[1]).toMatchObject({ pick_id: pick.id, channel: 'facebook', external_id: '111_222', ok: true, detail: 'pick announce' });
  });

  it('KHÔNG đăng lần hai khi sổ đã có tin — chống bài trùng trên kênh', async () => {
    // Nick 29/8: kênh có hai tin pick Tottenham y hệt (22:41 và 23:17). Luồng KẾT QUẢ
    // có chốt chặn này từ lâu, luồng PICK thì không.
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);
    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.logs.filter((l) => l.channel === 'telegram')).toHaveLength(1);
  });

  it('HUỶ pick vẫn báo được dù đã có tin đăng pick — chốt chặn chỉ chặn đúng loại tin', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);
    await announceVoid({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs.filter((l) => l.channel === 'telegram')).toHaveLength(2);
    expect(store.logs.map((l) => l.detail)).toContain('void announce');
  });

  it('caption Facebook KHÔNG mang link, link nằm ở bình luận đầu', async () => {
    // Jane 29/8: bài pick trên fanpage dán HAI link cùng trỏ một trang — một bản slug,
    // một bản mã id. Nick + Jane chốt: Facebook bỏ hẳn link khỏi caption, đưa xuống
    // bình luận (fanpage bóp tầm với bài dán link ra ngoài). Telegram thì giữ.
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: '111_222' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    const goi = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const anh = goi.find(([url]) => url.endsWith('/photos'));
    expect(anh).toBeDefined();
    expect(String(JSON.parse(String(anh![1].body)).caption)).not.toContain(`${SITE}/play/`);

    const binhLuan = goi.find(([url]) => url.endsWith('/comments'));
    expect(binhLuan).toBeDefined();
    expect(String(JSON.parse(String(binhLuan![1].body)).message)).toContain(`${SITE}/play/`);
  });

  it('caption Telegram VẪN giữ link — Telegram không phạt bài có link', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    expect(formatPickMessage(pick, SITE, {}, true)).toContain(`${SITE}/play/`);
  });

  it('skips the channel when CHANNEL_CHAT_ID is unset and FB when not configured', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: undefined, store, siteUrl: SITE }, pick);

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.logs).toHaveLength(0);
  });

  it('still posts to FB when the channel send fails, and never throws', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = { sendMessage: vi.fn(async () => { throw new Error('tg down'); }) };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: '111_333' }), { status: 200 })));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ channel: 'facebook', external_id: '111_333' });
  });

  it('does not throw when FB posting fails after a successful channel post', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    await announcePick({ api: api as unknown as AnnouncePickDeps['api'], channelChatId: CHANNEL, store, siteUrl: SITE, facebook: FB }, pick);

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ channel: 'telegram' });
  });
});

describe('in đậm dòng kèo (Peter 29/8)', () => {
  it('bọc <b> quanh hook khi gửi HTML, để nguyên khi gửi Facebook', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(publishedPick());
    const tg = formatPickMessage(pick, SITE, { hook: 'Over 2.5 @ 1.75' }, true);
    const fb = formatPickMessage(pick, SITE, { hook: 'Over 2.5 @ 1.75' }, false);
    expect(tg).toContain('📝 <b>Over 2.5 @ 1.75</b>');
    // Facebook không có chữ đậm — bên đó phải là chữ thường, không dính thẻ HTML.
    expect(fb).toContain('📝 Over 2.5 @ 1.75');
    expect(fb).not.toContain('<b>');
  });
});
