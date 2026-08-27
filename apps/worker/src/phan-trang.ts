/**
 * Phân trang qua trần 1000 dòng của PostgREST — dùng chung cho mọi select trên bảng có thể vượt trần.
 * Tách từ fixture-ingest.ts (PR #188) sau khi store.ts và booth-shadow.ts cũng cần (27/8/2026).
 */

/** PostgREST trả tối đa 1000 dòng một lần gọi (đo trên prod 27/8/2026) — bảng lớn hơn phải phân trang. */
export const TRAN_MOT_TRANG = 1000;

export type TruyVanPhanTrang<T> = {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

/** Đọc HẾT kết quả một truy vấn theo từng trang `kichThuoc` dòng. `taoQuery` phải trả builder MỚI mỗi lần
 *  (builder supabase-js không dùng lại được sau khi await) và đã `.order()` theo khoá ổn định (có cột duy nhất)
 *  để các trang không giẫm/sót nhau. Trang lỗi thì ném luôn — không trả về kết quả thiếu. */
export async function layHet<T>(taoQuery: () => TruyVanPhanTrang<T>, kichThuoc = TRAN_MOT_TRANG): Promise<T[]> {
  const tatCa: T[] = [];
  for (let from = 0; ; from += kichThuoc) {
    const { data, error } = await taoQuery().range(from, from + kichThuoc - 1);
    if (error) throw new Error(`layHet: lỗi trang từ dòng ${from} (đã gom ${tatCa.length}): ${error.message}`);
    const trang = data ?? [];
    tatCa.push(...trang);
    if (trang.length < kichThuoc) return tatCa;
  }
}
