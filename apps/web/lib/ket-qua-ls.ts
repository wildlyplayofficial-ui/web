/**
 * Tỷ số các trận đã đá từ livescore-api.com (matches/history.json) cho trang /ket-qua.
 * Vì sao: bảng fixtures CSDL ngừng cập nhật tỷ số từ 8/9/2026 và máy nạp PredictZ chưa gắn `kq`,
 * nên dòng tệp tuần không có nguồn tỷ số nào khác. Lỗi/quá hạn → phần đã lấy được (có thể rỗng).
 */
import { unstable_cache } from "next/cache";
import { lsFetch } from "./ls-fetch";
import type { TranLS } from "./ket-qua";

const GOC = "https://livescore-api.com/api-client/matches/history.json";
const TRANG_TOI_DA = 10;

export interface TranGoc {
  date?: string;
  scheduled?: string;
  status?: string;
  home?: { name?: string };
  away?: { name?: string };
  scores?: { ft_score?: string };
}

/** "2 - 1" → [2, 1]; chữ lạ → null. */
export function docTySo(s: string | undefined): [number, number] | null {
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(s ?? "");
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** Trận gốc của nhà cung cấp → TranLS; chưa kết thúc / thiếu tỷ số → null. */
export function doiTran(g: TranGoc): TranLS | null {
  const kq = docTySo(g.scores?.ft_score);
  if ((g.status ?? "").toUpperCase() !== "FINISHED" || !kq || !g.date || !g.home?.name || !g.away?.name) return null;
  const gio = /^\d\d:\d\d/.test(g.scheduled ?? "") ? (g.scheduled ?? "").slice(0, 5) : "12:00";
  return { home: g.home.name, away: g.away.name, kickoff: `${g.date}T${gio}:00Z`, kq };
}

async function lichSuImpl(tu: string, den: string): Promise<TranLS[]> {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];
  const ra: TranLS[] = [];
  try {
    for (let p = 1; p <= TRANG_TOI_DA; p++) {
      const res = await lsFetch(`${GOC}?key=${key}&secret=${secret}&from=${tu}&to=${den}&page=${p}`, { cache: "no-store" });
      if (!res.ok) break;
      const j = (await res.json()) as { success?: boolean; data?: { match?: TranGoc[]; total_pages?: number } };
      if (!j.success) break;
      for (const g of j.data?.match ?? []) {
        const t = doiTran(g);
        if (t) ra.push(t);
      }
      if (p >= (j.data?.total_pages ?? 1)) break;
    }
  } catch {
    /* quá hạn/lỗi mạng: trả phần đã lấy được */
  }
  return ra;
}

/** Trận đã đá từ ngày `tu` tới `den` (YYYY-MM-DD, ngày UTC), giữ 10 phút. */
export const lichSuTySo = unstable_cache(lichSuImpl, ["ket-qua-ls"], { revalidate: 600 });
