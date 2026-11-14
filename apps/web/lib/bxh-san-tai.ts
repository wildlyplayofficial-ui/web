/**
 * Nạp các trận đã đá của MỘT giải (livescore matches/history.json, có phân trang)
 * để dựng bảng sân nhà / sân khách. Lỗi/quá hạn → trả phần đã lấy được; chốt khớp bảng tổng nằm ở khopBangTong.
 */
import { unstable_cache } from "next/cache";
import { lsFetch } from "./ls-fetch";
import { doiTran, type TranGoc } from "./ket-qua-ls";
import type { TranDaDa } from "./bxh-san";

const GOC = "https://livescore-api.com/api-client/matches/history.json";
const TRANG_TOI_DA = 6;

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
  try {
    for (let p = 1; p <= TRANG_TOI_DA; p++) {
      const res = await lsFetch(`${GOC}?competition_id=${livescoreId}&key=${key}&secret=${secret}&from=${tu}&to=${den}&page=${p}`, { cache: "no-store" });
      if (!res.ok) break;
      const j = (await res.json()) as { success?: boolean; data?: { match?: TranGoc[]; total_pages?: number } };
      if (!j.success) break;
      for (const g of j.data?.match ?? []) {
        const t = doiTran(g);
        if (!t) continue;
        const khoa = `${t.home}|${t.away}|${t.kickoff}`;
        if (thay.has(khoa)) continue;
        thay.add(khoa);
        ra.push({ home: t.home, away: t.away, kq: t.kq });
      }
      if (p >= (j.data?.total_pages ?? 1)) break;
    }
  } catch {
    /* giữ phần đã lấy */
  }
  // Rỗng = coi như lỗi (không lưu cache); chỗ gọi .catch(() => []).
  if (ra.length === 0) throw new Error(`lịch sử giải ${livescoreId}: rỗng`);
  return ra;
}

const tranCuaGiaiCache = unstable_cache(tranCuaGiaiImpl, ["bxh-san-tran"], { revalidate: 3600 });

export const tranCuaGiai = (livescoreId: number) => {
  const nay = new Date();
  return tranCuaGiaiCache(livescoreId, dauMua(nay), new Date(nay.getTime() + 86_400_000).toISOString().slice(0, 10));
};
