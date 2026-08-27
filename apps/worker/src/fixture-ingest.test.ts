import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { ingestFixtures, laPlaceholder, layHet } from './fixture-ingest';

/** Giả lập PostgREST: mỗi lần gọi factory trả builder mới, `.range(from, to)` cắt đúng lát dữ liệu. */
function giaLapBang(tongDong: number, goi: [number, number][] = []) {
  const bang = Array.from({ length: tongDong }, (_, i) => ({ id: i }));
  const taoQuery = () => ({
    range: async (from: number, to: number) => {
      goi.push([from, to]);
      return { data: bang.slice(from, to + 1), error: null };
    },
  });
  return { taoQuery, goi };
}

describe('layHet — phân trang qua trần 1000 dòng của PostgREST (fixture-ingest 27/8/2026)', () => {
  it('gom đủ 2350 dòng thay vì dừng ở 1000', async () => {
    const { taoQuery } = giaLapBang(2350);
    const ketQua = await layHet(taoQuery);
    expect(ketQua).toHaveLength(2350);
  });

  it('gọi đúng 3 trang [0,999] [1000,1999] [2000,2999] cho 2350 dòng', async () => {
    const { taoQuery, goi } = giaLapBang(2350);
    await layHet(taoQuery);
    expect(goi).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('không mất/không trùng dòng nào giữa các trang', async () => {
    const { taoQuery } = giaLapBang(2350);
    const ketQua = await layHet(taoQuery);
    expect(ketQua.map((r) => r.id)).toEqual(Array.from({ length: 2350 }, (_, i) => i));
  });

  it('tổng đúng bội số trang (2000) → trang thứ 3 rỗng rồi dừng, không lặp vô hạn', async () => {
    const { taoQuery, goi } = giaLapBang(2000);
    const ketQua = await layHet(taoQuery);
    expect([ketQua.length, goi.length]).toEqual([2000, 3]);
  });

  it('dưới trần (196 dòng như bảng teams) → 1 lần gọi', async () => {
    const { taoQuery, goi } = giaLapBang(196);
    await layHet(taoQuery);
    expect(goi).toEqual([[0, 999]]);
  });

  it('trang lỗi thì ném lỗi kèm vị trí trang, không trả về kết quả thiếu', async () => {
    const taoQuery = () => ({
      range: async (from: number) => from === 0
        ? { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null }
        : { data: null, error: { message: 'boom' } },
    });
    await expect(layHet(taoQuery)).rejects.toThrow('layHet: lỗi trang từ dòng 1000 (đã gom 1000): boom');
  });
});

describe('laPlaceholder — chỉ bắt mã knock-out W/RU/L + số, không bắt đội thật', () => {
  it.each(['W101', 'RU101', 'L12'])('%s là placeholder', (ten) => {
    expect(laPlaceholder(ten)).toBe(true);
  });

  it.each(['Werder Bremen', 'Wolves', 'RU Kazan', 'Leeds', 'W', 'RU'])('%s KHÔNG phải placeholder', (ten) => {
    expect(laPlaceholder(ten)).toBe(false);
  });
});

/** Fake supabase tối thiểu: provider_mappings phân trang qua range, teams rỗng, fixtures ghi lại upsert. */
function giaLapSb(mappings: Record<string, unknown>[]) {
  const upserted: Record<string, unknown>[] = [];
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    for (const k of ['select', 'order']) b[k] = () => b;
    b.range = async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });
    b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res);
    b.upsert = async (row: Record<string, unknown>) => { upserted.push(row); return { error: null }; };
    return b;
  };
  const sb = {
    from: (table: string) => builder(table === 'provider_mappings' ? mappings : []),
    rpc: async () => ({ data: null, error: null }),
  } as unknown as SupabaseClient;
  return { sb, upserted };
}

const mapping = (home: string, away: string, kickoff_utc = '2026-08-30T13:30:00+00:00') => ({
  competition_id: 'bundesliga', home_team: home, away_team: away, kickoff_utc,
  odds_api_event_id: null, livescore_match_id: null, slug: null,
});

describe('ingestFixtures — Werder Bremen vào fixtures, placeholder thì không (27/8/2026)', () => {
  it('upsert trận Freiburg vs Werder Bremen 30/8 (bộ lọc like W% cũ từng cắt oan)', async () => {
    const { sb, upserted } = giaLapSb([mapping('Freiburg', 'Werder Bremen')]);
    await ingestFixtures(sb);
    expect(upserted.map((r) => `${r.home_team_name} vs ${r.away_team_name}`)).toEqual(['Freiburg vs Werder Bremen']);
  });

  it('bỏ mapping có placeholder ở bất kỳ bên nào (W101 vs RU101, L12 vs Leeds)', async () => {
    const { sb, upserted } = giaLapSb([mapping('W101', 'RU101'), mapping('L12', 'Leeds'), mapping('Wolves', 'Leeds')]);
    await ingestFixtures(sb);
    expect(upserted.map((r) => r.home_team_name)).toEqual(['Wolves']);
  });

  it('đọc hết 1262 mapping qua 2 trang rồi upsert đủ 1262 (không dừng ở 1000)', async () => {
    const nhieu = Array.from({ length: 1262 }, (_, i) => mapping(`Doi ${i}`, 'Werder Bremen', `2026-10-${String(1 + (i % 28)).padStart(2, '0')}T12:00:00+00:00`));
    const { sb, upserted } = giaLapSb(nhieu);
    await ingestFixtures(sb);
    expect(upserted).toHaveLength(1262);
  });
});
