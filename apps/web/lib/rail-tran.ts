/**
 * Dải "Tỷ số & lịch đấu" trang chủ (Peter 14/11): lấy trận THẬT từ bảng dự đoán (bài + tệp tuần), mọi giải,
 * không dùng Livescore fixtures nữa (nó trả ngày sai: Man City - Fulham hiện "hôm nay" trong khi lịch gốc là 21/11).
 * Hàm THUẦN, import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";

export interface RailTran {
  id: string;
  giai: string;
  nha: string;
  khach: string;
  logoNha: string | null;
  logoKhach: string | null;
  kickoffUtc: string;
  /** Tỷ số thật, null = chưa đá xong. */
  that: [number, number] | null;
  /** Đã bắt đầu nhưng chưa có tỷ số cuối (đang đá). */
  dangDa: boolean;
}

export const TOI_DA = 14;
const TOI_DA_DA_XONG = 4;
const MOI_GIAI = 3;
/** Trận bắt đầu quá ngần này mà chưa có tỷ số thì bỏ (không biết kết quả, không còn là "sắp đá"). */
const DANG_DA_MS = 130 * 60_000;
/** Kết quả chỉ giữ trong ngần này sau giờ đá. */
const KET_QUA_MS = 20 * 3_600_000;

const GIAI_LON = /premier league|ngoại hạng|la liga|serie a$|^italy serie a|bundesliga|ligue 1|champions league|cúp c1|europa league/i;
const DOI_TUYEN = /nations league|world cup|euro|africa cup|copa america|asian cup|friendl|giao hữu|qualif|vòng loại/i;

/** 0 = giải lớn / đội tuyển quốc gia, 1 = còn lại. */
export const hang = (giai: string) => (GIAI_LON.test(giai) || DOI_TUYEN.test(giai) ? 0 : 1);

export function railTran(rows: readonly HangDuDoan[], now: number, toiDa = TOI_DA): RailTran[] {
  const ung = rows.flatMap((h): { r: RailTran; t: number; kq: boolean }[] => {
    const t = Date.parse(h.kickoffUtc);
    if (Number.isNaN(t) || !h.nha || !h.khach) return [];
    const kq = h.that !== null;
    if (kq ? now - t > KET_QUA_MS : t < now - DANG_DA_MS) return [];
    if (!kq && t > now + 5 * 86_400_000) return [];
    return [{
      kq,
      t,
      r: {
        id: h.slug,
        giai: h.giai,
        nha: h.nha,
        khach: h.khach,
        logoNha: h.logoNha,
        logoKhach: h.logoKhach,
        kickoffUtc: h.kickoffUtc,
        that: h.that,
        dangDa: !kq && t <= now,
      },
    }];
  });
  // Ưu tiên giải lớn/đội tuyển, rồi gần giờ hiện tại nhất; mỗi giải tối đa MOI_GIAI, kết quả tối đa TOI_DA_DA_XONG.
  const xep = [...ung].sort((a, b) => hang(a.r.giai) - hang(b.r.giai) || Math.abs(a.t - now) - Math.abs(b.t - now));
  const demGiai = new Map<string, number>();
  let daXong = 0;
  const chon: typeof ung = [];
  for (const x of xep) {
    if (chon.length >= toiDa) break;
    if (x.kq && daXong >= TOI_DA_DA_XONG) continue;
    const n = demGiai.get(x.r.giai) ?? 0;
    if (n >= MOI_GIAI) continue;
    demGiai.set(x.r.giai, n + 1);
    if (x.kq) daXong++;
    chon.push(x);
  }
  return chon.sort((a, b) => a.t - b.t).map((x) => x.r);
}
