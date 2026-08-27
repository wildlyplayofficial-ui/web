import { describe, expect, it } from 'vitest';
import { layHet } from './phan-trang';

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

describe('layHet — phân trang qua trần 1000 dòng của PostgREST (tách từ fixture-ingest 27/8/2026)', () => {
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
