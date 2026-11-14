/**
 * Nạp các trận đã đá của MỘT giải (livescore matches/history.json, có phân trang)
 * để dựng bảng sân nhà / sân khách. Thiếu bất kỳ trang nào → NÉM LỖI (không để cache giữ bản dở); chốt khớp bảng tổng nằm ở khopBangTong.
 */
import { unstable_cache } from "next/cache";
import { lsFetch } from "./ls-fetch";
import { doiTran, type TranGoc } from "./ket-qua-ls";
import type { TranDaDa } from "./bxh-san";

const GOC = "https://livescore-api.com/api-client/matches/history.json";
// Một mùa châu Âu giữa chừng ~200-300 trận; dư để cuối mùa không bị cắt (cắt = bảng sân lệch bảng tổng).
const TRANG_TOI_DA = 14;

/** Mùa châu Âu bắt đầu quanh tháng 8: lấy từ 1/7 gần nhất. */
export function dauMua(nay: Date): string {
  const nam = nay.getUTCMonth() >= 6 ? nay.getUTCFullYear() : nay.getUTCFullYear() - 1;
  return `${nam}-07-01`;
}

async function tranCuaGiaiImpl(livescoreId: number, tu: string, den: string): Promise<TranDaDa[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];
  const ra: TranDaDa[] = [];
  const thay = new Set<string>();
  type Trang = { success?: boolean; data?: { match?: TranGoc[]; total_pages?: number } };
  const layMot = async (p: number): Promise<Trang | null> => {
    try {
      const res = await lsFetch(`${GOC}?competition_id=${livescoreId}&key=${key}&secret=${secret}&from=${tu}&to=${den}&page=${p}`, { cache: "no-store" });
      if (!res.ok) return null;
      const j = (await res.json()) as Trang;
      return j.success ? j : null;
    } catch {
      return null;
    }
  };
  // Thử lại 1 lần: lỗi/quá hạn thoáng qua là nguyên nhân bảng sân nhà/khách chớp "Chưa có dữ liệu".
  const lay = async (p: number): Promise<Trang | null> => (await layMot(p)) ?? (await layMot(p));
  const them = (j: Trang | null) => {
    for (const g of j?.data?.match ?? []) {
      const t = doiTran(g);
      if (!t) continue;
      const khoa = `${t.home}|${t.away}|${t.kickoff}`;
      if (thay.has(khoa)) continue;
      thay.add(khoa);
      ra.push({ home: t.home, away: t.away, kq: t.kq });
    }
  };
  // Trang 1 trước để biết tổng số trang, các trang còn lại gọi SONG SONG (tuần tự dễ vượt hạn giờ lúc dựng nguội).
  const dau = await lay(1);
  if (!dau) throw new Error(`lịch sử giải ${livescoreId}: trang 1 lỗi`);
  them(dau);
  const tong = dau.data?.total_pages ?? 1;
  if (tong > TRANG_TOI_DA) throw new Error(`lịch sử giải ${livescoreId}: ${tong} trang, quá trần ${TRANG_TOI_DA}`);
  const con = await Promise.all(Array.from({ length: Math.max(0, tong - 1) }, (_, i) => lay(i + 2)));
  // THIẾU trang nào cũng NÉM LỖI: trả phần dở thì unstable_cache lưu 1 giờ và bảng sân lệch bảng tổng cả giờ.
  if (con.some((j) => j === null)) throw new Error(`lịch sử giải ${livescoreId}: thiếu trang`);
  con.forEach(them);
  if (ra.length === 0) throw new Error(`lịch sử giải ${livescoreId}: rỗng`);
  return ra;
}

const tranCuaGiaiCache = unstable_cache(tranCuaGiaiImpl, ["bxh-san-tran"], { revalidate: 3600 });

export const tranCuaGiai = (livescoreId: number) => {
  const nay = new Date();
  return tranCuaGiaiCache(livescoreId, dauMua(nay), new Date(nay.getTime() + 86_400_000).toISOString().slice(0, 10));
};
