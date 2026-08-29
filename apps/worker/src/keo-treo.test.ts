import { describe, expect, it, vi } from 'vitest';
import { canhKeoTreo, locKeoTreo, loiNhac, type CanhDeps } from './keo-treo';
import { MemoryStore, type NewPick, type PickRow } from './store';

const GIO = 3_600_000;

function pick(overrides: Partial<NewPick> = {}): NewPick {
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
    thesis: 'x',
    status: 'published',
    published_at: '2026-08-29T15:41:00.000Z',
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

const KICK = new Date('2026-08-29T16:30:00.000Z').getTime();
const sau = (h: number) => new Date(KICK + h * GIO);

describe('locKeoTreo', () => {
  it('KHÔNG nhắc khi trận vừa đá xong — poll còn đang thử', async () => {
    const store = new MemoryStore();
    const p = await store.insertPick(pick({ fixture_id: 0 }));
    expect(locKeoTreo([p], sau(1))).toHaveLength(0);
  });

  it('nhắc kèo KHÔNG có mã trận sau 3 tiếng — máy không bao giờ chấm được', async () => {
    const store = new MemoryStore();
    const p = await store.insertPick(pick({ fixture_id: 0 }));
    expect(locKeoTreo([p], sau(4))).toHaveLength(1);
  });

  it('KHÔNG nhắc kèo CÓ mã trận ở giờ thứ 4 — poll vẫn đang thử tới giờ thứ 8', async () => {
    // Nhắc lúc này là báo động giả: 5 phút sau poll chấm xong thì tin nhắc thành rác.
    const store = new MemoryStore();
    const p = await store.insertPick(pick({ fixture_id: 12345 }));
    expect(locKeoTreo([p], sau(4))).toHaveLength(0);
  });

  it('nhắc kèo CÓ mã trận khi đã quá 8 tiếng — poll bỏ cuộc rồi', async () => {
    const store = new MemoryStore();
    const p = await store.insertPick(pick({ fixture_id: 12345 }));
    expect(locKeoTreo([p], sau(9))).toHaveLength(1);
  });

  it('bỏ qua kèo đã chấm và kèo đã huỷ', async () => {
    const store = new MemoryStore();
    const a = await store.insertPick(pick({ status: 'won' }));
    const b = await store.insertPick(pick({ status: 'void' }));
    expect(locKeoTreo([a, b], sau(9))).toHaveLength(0);
  });
});

function deps(store: MemoryStore, gui = vi.fn(async () => ({}))): CanhDeps & { gui: typeof gui } {
  return { store, guiTin: gui, nguoiNhan: ['111', '222'], gui };
}

describe('canhKeoTreo', () => {
  it('nhắc MỘT LẦN cho mỗi kèo, chạy lại không nhắc nữa', async () => {
    const store = new MemoryStore();
    await store.insertPick(pick({ fixture_id: 0 }));
    const d = deps(store);

    const lan1 = await canhKeoTreo(d, sau(4));
    const lan2 = await canhKeoTreo(d, sau(5));

    expect(lan1).toHaveLength(1);
    expect(lan2).toHaveLength(0);
    expect(d.gui).toHaveBeenCalledTimes(2); // hai người nhận, một lượt nhắc
  });

  it('gửi hỏng HẾT thì KHÔNG ghi dấu vết — lần sau còn nhắc lại được', async () => {
    // Ghi dấu vết sớm là kèo treo im lặng vĩnh viễn, đúng lỗi file này sinh ra để chữa.
    const store = new MemoryStore();
    await store.insertPick(pick({ fixture_id: 0 }));
    const hong = vi.fn(async () => { throw new Error('tg down'); });
    const d = deps(store, hong as never);

    const lan1 = await canhKeoTreo(d, sau(4));
    expect(lan1).toHaveLength(0);
    expect(store.logs).toHaveLength(0);

    const d2 = deps(store);
    expect(await canhKeoTreo(d2, sau(5))).toHaveLength(1);
  });

  it('một người nhận hỏng thì vẫn tính là đã nhắc', async () => {
    const store = new MemoryStore();
    await store.insertPick(pick({ fixture_id: 0 }));
    let lan = 0;
    const gui = vi.fn(async () => {
      lan += 1;
      if (lan === 1) throw new Error('người này chặn bot');
      return {};
    });
    const d = deps(store, gui as never);
    expect(await canhKeoTreo(d, sau(4))).toHaveLength(1);
  });

  it('lời nhắc có lệnh /score dán được ngay', async () => {
    const store = new MemoryStore();
    const p = await store.insertPick(pick({ fixture_id: 0 }));
    const chu = loiNhac(p as PickRow, sau(4));
    expect(chu).toContain(`/score ${p.id} 0-0`);
    expect(chu).toContain('Tottenham Hotspur vs Newcastle United');
    expect(chu).toContain('không có mã trận');
  });

  it('kho hỏng thì trả về rỗng, không ném lỗi', async () => {
    const store = new MemoryStore();
    vi.spyOn(store, 'listByStatus').mockRejectedValueOnce(new Error('db down'));
    await expect(canhKeoTreo(deps(store), sau(4))).resolves.toEqual([]);
  });
});
