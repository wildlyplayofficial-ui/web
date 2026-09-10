import { describe, expect, it, vi } from 'vitest';
import { buildOddsRows, collectOddsTick, trueProbabilities } from './odds-collect';

const EVENT = { id: 72221170, home: 'Newcastle United', away: 'Liverpool FC', date: '2026-08-23T15:30:00Z', homeId: 2814, awayId: 2820 };

describe('buildOddsRows', () => {
  it('giữ 4 loại kèo dùng cho trang, bỏ 115 loại phụ', () => {
    const rows = buildOddsRows(EVENT, 'epl-2026', [
      { name: 'ML', updatedAt: '2026-08-23T06:43:00Z', odds: [{ home: '3.900', draw: '3.700', away: '1.909' }] },
      { name: 'Spread', odds: [{ hdp: 0.5, home: '1.925', away: '1.925' }] },
      { name: 'Totals', odds: [{ hdp: 2.5, over: '1.500', under: '2.500' }] },
      { name: 'European Handicap', odds: [{ hdp: 1, home: '1.833', draw: '4.333', away: '3.100' }] },
      { name: 'ML HT', odds: [{ home: '2.500', draw: '2.100', away: '3.400' }] },
      { name: 'Spread HT', odds: [{ hdp: 0.25, home: '1.900', away: '1.950' }] },
      { name: 'Totals HT', odds: [{ hdp: 1.5, over: '2.100', under: '1.750' }] },
      { name: 'Player Tackles', odds: [{ label: 'Wataru Endo', hdp: 0.5, over: '1.050' }] },
      { name: 'Corners Totals', odds: [{ hdp: 10.5, over: '1.825', under: '1.975' }] },
    ]);
    // Giữ cả thị trường HIỆP 1, vẫn bỏ mấy thị trường phụ (cầu thủ, phạt góc).
    expect(rows.map((r) => r.market)).toEqual([
      'ML', 'Spread', 'Totals', 'European Handicap', 'ML HT', 'Spread HT', 'Totals HT',
    ]);
  });

  it('lưu mã đội để lấy logo, thiếu mã thì để null chứ không đoán', () => {
    const [r] = buildOddsRows(EVENT, 'epl-2026', [
      { name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] },
    ]);
    expect(r.home_id).toBe(2814);
    expect(r.away_id).toBe(2820);

    // Nhà cung cấp không trả mã → null. KHÔNG được ghép logo theo tên thay thế:
    // ghép tên từng gán "Sabah Masazir" vào logo "Sabah", hai CLB khác nước.
    const { homeId: _h, awayId: _a, ...khongMa } = EVENT;
    const [r2] = buildOddsRows(khongMa, 'epl-2026', [
      { name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] },
    ]);
    expect(r2.home_id).toBeNull();
    expect(r2.away_id).toBeNull();
  });

  it('đổi chuỗi kèo sang số, giữ null cho ô không có', () => {
    const [ml] = buildOddsRows(EVENT, 'epl-2026', [
      { name: 'ML', odds: [{ home: '3.900', draw: '3.700', away: '1.909' }] },
    ]);
    expect(ml.home_odds).toBe(3.9);
    expect(ml.away_odds).toBe(1.909);
    expect(ml.over_odds).toBeNull();
    expect(ml.hdp).toBeNull();
    expect(ml.bookmaker).toBe('Bet365');
    expect(ml.kickoff_utc).toBe(EVENT.date);
  });

  it('một loại kèo nhiều mức chấp → nhiều dòng', () => {
    const rows = buildOddsRows(EVENT, 'epl-2026', [
      { name: 'Spread', odds: [{ hdp: 0.5, home: '1.925', away: '1.925' }, { hdp: -1, home: '7.000', away: '1.100' }] },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.hdp)).toEqual([0.5, -1]);
  });

  it('trận không có kèo nào → không đẻ dòng rác', () => {
    expect(buildOddsRows(EVENT, 'epl-2026', [])).toEqual([]);
  });
});

describe('trueProbabilities — bóc phần nhà cái giữ', () => {
  it('tính đúng trên kèo thật Newcastle vs Liverpool (3.90/3.70/1.909)', () => {
    const p = trueProbabilities(3.9, 3.7, 1.909)!;
    expect(p.home).toBeCloseTo(0.2441, 3);
    expect(p.draw).toBeCloseTo(0.2573, 3);
    expect(p.away).toBeCloseTo(0.4986, 3);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 10); // cộng lại đúng 100%
    expect(p.margin).toBeCloseTo(0.0505, 3);
  });

  it('kèo thiếu hoặc lỗi → null, không trả số bịa', () => {
    expect(trueProbabilities(null, 3.7, 1.9)).toBeNull();
    expect(trueProbabilities(3.9, 3.7, null)).toBeNull();
    expect(trueProbabilities(1, 3.7, 1.9)).toBeNull();
  });
});

describe('collectOddsTick — không được làm chết worker', () => {
  const store = () => {
    const inserted: unknown[][] = [];
    return {
      inserted,
      from: () => ({ insert: async (rows: unknown[]) => { inserted.push(rows); return { error: null }; } }),
    };
  };

  it('một giải lỗi mạng thì các giải khác vẫn chạy', async () => {
    const s = store();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('league=england-premier-league')) return { ok: false, status: 500 } as Response;
      if (u.includes('events?')) {
        return { ok: true, json: async () => [{ ...EVENT, date: '2026-08-23T15:30:00Z' }] } as Response;
      }
      return {
        ok: true,
        json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }),
      } as Response;
    });
    const n = await collectOddsTick({
      apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
      now: () => new Date('2026-08-23T07:00:00Z').getTime(),
    });
    expect(n).toBeGreaterThan(0);      // vẫn ghi được từ các giải còn lại
    expect(s.inserted.length).toBe(1);
  });

  it('không lấy được gì thì trả 0, không ném lỗi', async () => {
    const s = store();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429 }) as Response);
    await expect(collectOddsTick({
      apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
      now: () => Date.now(),
    })).resolves.toBe(0);
    expect(s.inserted).toEqual([]);
  });

  it('khoá đầu hết lượt (429) thì đổi sang khoá sau, không mất trận', async () => {
    const s = store();
    // Khoá 1 đã cạn 100 lượt/giờ; khoá 2 còn lượt.
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('apiKey=het')) return { ok: false, status: 429 } as Response;
      if (u.includes('events?')) return { ok: true, json: async () => [EVENT] } as Response;
      return {
        ok: true,
        json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }),
      } as Response;
    });
    const n = await collectOddsTick({
      apiKey: ['het', 'con'], store: s as never, fetchImpl: fetchImpl as never,
      now: () => new Date('2026-08-23T07:00:00Z').getTime(),
    });
    expect(n).toBeGreaterThan(0);
    // Sau khi đổi khoá thì không gọi lại khoá cạn nữa — đúng một lần chạm 429.
    expect(fetchImpl.mock.calls.filter((c) => String(c[0]).includes('apiKey=het')).length).toBe(1);
  });

  it('mọi khoá đều hết lượt thì trả 0, không ném lỗi', async () => {
    const s = store();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429 }) as Response);
    await expect(collectOddsTick({
      apiKey: ['a', 'b'], store: s as never, fetchImpl: fetchImpl as never,
      now: () => Date.now(),
    })).resolves.toBe(0);
    expect(s.inserted).toEqual([]);
  });

  it('cạn hết khoá thì DỪNG NHỊP, không thử tiếp giải sau', async () => {
    // Đo nhật ký prod 9/9/2026: khi cạn khoá, máy vẫn thử đủ 3 khoá cho TỪNG giải
    // — 73 lượt gọi hỏng, 14 giải bị bỏ, học lại cùng một điều bảy lần.
    // Giờ phải dừng ngay sau giải đầu: 2 khoá × 1 giải = ĐÚNG 2 lượt gọi.
    const s = store();
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429 }) as Response);
    await collectOddsTick({
      apiKey: ['a', 'b'], store: s as never, fetchImpl: fetchImpl as never,
      now: () => Date.now(),
    });
    expect(fetchImpl.mock.calls.length).toBe(2);
  });

  it('ghi xong thì báo web bỏ đệm, không ghi được thì không báo', async () => {
    const goi: string[][] = [];
    const revalidate = async (tags: string[]) => { goi.push(tags); };
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('events?')) return { ok: true, json: async () => [EVENT] } as Response;
      return {
        ok: true,
        json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }),
      } as Response;
    });
    const chung = {
      apiKey: 'k', fetchImpl: fetchImpl as never,
      now: () => new Date('2026-08-23T07:00:00Z').getTime(), revalidate,
    };
    await collectOddsTick({ ...chung, store: store() as never });
    expect(goi).toEqual([['odds']]);

    // Không thu được dòng nào thì đừng bắt web tính lại vô ích.
    goi.length = 0;
    await collectOddsTick({
      ...chung, store: store() as never,
      fetchImpl: (async () => ({ ok: false, status: 500 }) as Response) as never,
    });
    expect(goi).toEqual([]);
  });

  it('trận còn xa: lần đầu vẫn lấy (giữ kèo mở), lần sau giãn, tới giờ mới lấy lại', async () => {
    // Trận cách 3 ngày — trong cửa sổ 96 tiếng nhưng ngoài ngưỡng 24 tiếng.
    const XA = { ...EVENT, id: 99001, date: '2026-08-26T15:30:00Z' };
    const chay = async (gio: string) => {
      const s = store();
      const fetchImpl = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('events?')) return { ok: true, json: async () => [XA] } as Response;
        return { ok: true, json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }) } as Response;
      });
      await collectOddsTick({
        apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
        now: () => new Date(gio).getTime(),
      });
      return fetchImpl.mock.calls.filter((c) => String(c[0]).includes('odds?eventId=')).length;
    };

    // Lần ĐẦU thấy trận này → phải lấy ngay dù còn xa, nếu không mất kèo mở.
    expect(await chay('2026-08-23T07:00:00Z')).toBeGreaterThan(0);
    // Nhịp thường sau đó → giãn, không tốn lượt nào cho trận xa.
    expect(await chay('2026-08-23T10:00:00Z')).toBe(0);
    // Tới giờ lấy lại trong ngày (00h/12h UTC) → lấy lại.
    expect(await chay('2026-08-24T12:00:00Z')).toBeGreaterThan(0);
  });

  it('trận sắp đá (trong 24 tiếng) thì nhịp nào cũng lấy, không giãn', async () => {
    const GAN = { ...EVENT, id: 99002, date: '2026-08-23T20:00:00Z' };
    const chay = async () => {
      const s = store();
      const fetchImpl = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('events?')) return { ok: true, json: async () => [GAN] } as Response;
        return { ok: true, json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }) } as Response;
      });
      await collectOddsTick({
        apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
        now: () => new Date('2026-08-23T07:00:00Z').getTime(),
      });
      return fetchImpl.mock.calls.filter((c) => String(c[0]).includes('odds?eventId=')).length;
    };
    expect(await chay()).toBeGreaterThan(0);
    expect(await chay()).toBeGreaterThan(0); // lần hai vẫn lấy
  });

  it('bỏ qua trận quá xa (ngoài 4 ngày) để khỏi phí lượt gọi', async () => {
    const s = store();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('events?')) {
        return { ok: true, json: async () => [{ ...EVENT, date: '2026-09-30T15:30:00Z' }] } as Response;
      }
      return { ok: true, json: async () => ({ bookmakers: { Bet365: [] } }) } as Response;
    });
    const n = await collectOddsTick({
      apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
      now: () => new Date('2026-08-23T07:00:00Z').getTime(),
    });
    expect(n).toBe(0);
    // chỉ gọi danh sách trận của 5 giải, không gọi kèo trận nào
    expect(fetchImpl.mock.calls.every((c) => String(c[0]).includes('events?'))).toBe(true);
  });

  it('chạm trần CAP thì hoãn trận XA nhất, lấy trận sắp đá trước (soonest-first)', async () => {
    // 100 trận sắp đá, cách nhau 1 phút — vượt xa trần mặc định 60 lượt/nhịp.
    const nowMs = new Date('2026-08-23T07:00:00Z').getTime();
    const many = Array.from({ length: 100 }, (_, k) => ({
      ...EVENT, id: 500000 + k,
      date: new Date(nowMs + (k + 1) * 60_000).toISOString(),
    }));
    const s = store();
    const daGoi: number[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      // chỉ giải đầu trả danh sách, các giải sau rỗng — cô lập phép đo vào một giải
      if (u.includes('events?')) {
        return { ok: true, json: async () => (u.includes('england-premier-league') ? many : []) } as Response;
      }
      const m = u.match(/eventId=(\d+)/);
      if (m) daGoi.push(Number(m[1]));
      return { ok: true, json: async () => ({ bookmakers: { Bet365: [{ name: 'ML', odds: [{ home: '2.0', draw: '3.0', away: '4.0' }] }] } }) } as Response;
    });
    await collectOddsTick({
      apiKey: 'k', store: s as never, fetchImpl: fetchImpl as never,
      now: () => nowMs,
    });
    // KHÔNG lấy hết 100 trận — bị trần chặn lại
    expect(daGoi.length).toBeGreaterThan(0);
    expect(daGoi.length).toBeLessThanOrEqual(60);
    expect(daGoi.length).toBeLessThan(100);
    // Trận được lấy phải là các trận SỚM NHẤT: id nhỏ = sớm hơn theo cách dựng
    const chuaLay = many.map((e) => e.id).filter((id) => !daGoi.includes(id));
    expect(Math.max(...daGoi)).toBeLessThan(Math.min(...chuaLay));
  });
});
