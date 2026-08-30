import { afterEach, describe, expect, it, vi } from 'vitest';
import { lamMoiBai, bangBaoCao, type LamMoiDeps } from './lam-moi';
import { MemoryStore, type NewPick } from './store';

const SITE = 'https://banhbong.net';
const FB = { pageId: '111', pageToken: 'tok' };
const CHANNEL = '-100123';

function pickMau(overrides: Partial<NewPick> = {}): NewPick {
  return {
    fixture_id: 0,
    league: 'Premier League 2026-27',
    kickoff_utc: '2026-08-29T16:30:00.000Z',
    home_team: 'Tottenham Hotspur',
    away_team: 'Newcastle United',
    market: 'ou',
    selection: 'Over 2.5',
    line: 2.5,
    odds_publish: 1.75,
    odds_close: null,
    publish_score_home: null,
    publish_score_away: null,
    home_id: null,
    away_id: null,
    stake_units: 0.25,
    thesis: 'thesis',
    status: 'published',
    published_at: '2026-08-29T10:00:00.000Z',
    home_score: null,
    away_score: null,
    raw_outcome: null,
    units_pl: null,
    settled_at: null,
    confidence: 'low',
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
    ...overrides,
  } as NewPick;
}

function fakeApi() {
  return {
    editMessageMedia: vi.fn(async () => ({ message_id: 338 })),
    editMessageCaption: vi.fn(async () => ({ message_id: 338 })),
  };
}

function deps(store: MemoryStore, api: ReturnType<typeof fakeApi>, extra: Partial<LamMoiDeps> = {}): LamMoiDeps {
  return {
    api: api as unknown as LamMoiDeps['api'],
    store,
    channelChatId: CHANNEL,
    siteUrl: SITE,
    facebook: FB,
    now: () => 1_700_000_000,
    ...extra,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('lamMoiBai', () => {
  it('thay ảnh Telegram thì LUÔN gửi kèm caption — thiếu là Telegram xoá chữ', async () => {
    // Sự cố 29/8: Jane gọi editMessageMedia không kèm caption, tin pick Liverpool
    // mất sạch chữ chỉ còn ảnh. Đây là chốt chặn cho đúng chỗ đó.
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau());
    await store.insertChannelLog({ pick_id: pick.id, channel: 'telegram', external_id: '338', ok: true, detail: 'pick announce' });
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 })));

    const bao = await lamMoiBai(deps(store, api), pick);

    expect(api.editMessageMedia).toHaveBeenCalledTimes(1);
    const [chat, msgId, media] = api.editMessageMedia.mock.calls[0] as unknown as [string, number, Record<string, string>];
    expect(chat).toBe(CHANNEL);
    expect(msgId).toBe(338);
    expect(media.caption).toBeTruthy();
    expect(media.parse_mode).toBe('HTML');
    expect(bao.find((b) => b.buoc === 'telegram')?.xong).toBe(true);
  });

  it('ảnh có đuôi v khác nhau — cùng URL là Telegram trả lại ảnh cũ đã nhớ', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau());
    await store.insertChannelLog({ pick_id: pick.id, channel: 'telegram', external_id: '338', ok: true });
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 })));

    await lamMoiBai(deps(store, api, { now: () => 111 }), pick);
    await lamMoiBai(deps(store, api, { now: () => 222 }), pick);

    const anh = api.editMessageMedia.mock.calls.map((c) => (c as unknown as [string, number, { media: string }])[2].media);
    expect(anh[0]).toContain('v=111');
    expect(anh[1]).toContain('v=222');
    expect(anh[0]).not.toBe(anh[1]);
  });

  it('bảo Facebook quét lại — pick chưa đá thì một trang, đã chấm thì thêm bài xem lại', async () => {
    const store = new MemoryStore();
    const chuaDa = await store.insertPick(pickMau());
    const daCham = await store.insertPick(pickMau({
      status: 'won', home_score: 2, away_score: 2, raw_outcome: 'win', units_pl: 0.19,
      settled_at: '2026-08-29T18:30:00.000Z',
    }));
    const api = fakeApi();

    const goi: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => {
      goi.push(String(JSON.parse(String(init?.body ?? '{}')).id));
      return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
    }));

    await lamMoiBai(deps(store, api), chuaDa);
    expect(goi).toEqual([`${SITE}/play/${chuaDa.id}`]);

    goi.length = 0;
    await lamMoiBai(deps(store, api), daCham);
    expect(goi).toHaveLength(2);
    expect(goi[0]).toBe(`${SITE}/play/${daCham.id}`);
    expect(goi[1]).toContain('/analysis/recap-');
  });

  it('Facebook hỏng KHÔNG kéo Telegram hỏng theo', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau());
    await store.insertChannelLog({ pick_id: pick.id, channel: 'telegram', external_id: '338', ok: true });
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('graph down'); }));

    const bao = await lamMoiBai(deps(store, api), pick);

    expect(bao.find((b) => b.buoc === 'telegram')?.xong).toBe(true);
    expect(bao.filter((b) => b.buoc === 'facebook').every((b) => !b.xong)).toBe(true);
  });

  it('chưa đăng tin nào thì báo rõ, không ném lỗi', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau());
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 })));

    const bao = await lamMoiBai(deps(store, api), pick);

    expect(api.editMessageMedia).not.toHaveBeenCalled();
    expect(bao.find((b) => b.buoc === 'telegram')).toMatchObject({ xong: false });
  });

  it('pick đã chấm thì caption là bản KẾT QUẢ, không phải bản trước trận', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau({
      status: 'won', home_score: 2, away_score: 2, raw_outcome: 'win', units_pl: 0.19,
      settled_at: '2026-08-29T18:30:00.000Z',
    }));
    await store.insertChannelLog({ pick_id: pick.id, channel: 'telegram', external_id: '336', ok: true });
    const api = fakeApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 })));

    await lamMoiBai(deps(store, api), pick);

    const media = (api.editMessageMedia.mock.calls[0] as unknown as [string, number, { caption: string }])[2];
    expect(media.caption).toContain('Kết quả: 2-2');
    expect(media.caption).toContain('Xem lại trận');
  });
});

describe('bangBaoCao', () => {
  it('một dòng mỗi bước, có dấu đạt/hỏng', async () => {
    const store = new MemoryStore();
    const pick = await store.insertPick(pickMau());
    const chu = bangBaoCao(pick, [
      { buoc: 'telegram', xong: true, ghiChu: 'tin 338' },
      { buoc: 'facebook', xong: false, ghiChu: 'hỏng' },
    ]);
    expect(chu).toContain('Tottenham Hotspur vs Newcastle United');
    expect(chu).toContain('✅ telegram: tin 338');
    expect(chu).toContain('❌ facebook: hỏng');
  });
});
