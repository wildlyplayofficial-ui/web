/**
 * Kèo xiên dựng từ bảng dự đoán (Peter gật 12/11): gom các trận chưa đá mà cửa dự đoán có tỷ lệ
 * thấp nhất (nguồn tin cửa đó nhất), nhân tỷ lệ thành tỷ lệ gộp. Khối nhỏ trên /du-doan và trang
 * riêng /du-doan/xien dùng chung. Chỉ dùng số đã có trên dòng trận — không thêm dự đoán mới,
 * không tên nhà cái. Hàm THUẦN, import tương đối để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { GIAI_TRANG } from "./du-doan-loc";

export interface ChanXien {
  h: HangDuDoan;
  /** 0 = chủ nhà thắng, 1 = hòa, 2 = khách thắng (trùng thứ tự ô 1·X·2); "tai"/"xiu" = mốc 2,5 bàn. */
  cua: 0 | 1 | 2 | "tai" | "xiu";
  gia: number;
}

export interface Xien {
  chan: ChanXien[];
  /** Tỷ lệ gộp = tích tỷ lệ các chân. */
  tong: number;
}

/** Dưới 1,20 gộp vào không thêm được gì; trên 2,20 thì chính nguồn cũng không chắc cửa đó. */
const GIA_MIN = 1.2;
const GIA_MAX = 2.2;
const IT_NHAT = 3;

function gom(chan: ChanXien[], toiDa: number): Xien | null {
  const chon = chan
    .filter((c) => c.gia >= GIA_MIN && c.gia <= GIA_MAX)
    .sort((a, b) => a.gia - b.gia || a.h.kickoffUtc.localeCompare(b.h.kickoffUtc))
    .slice(0, toiDa);
  if (chon.length < IT_NHAT) return null;
  return { chan: chon, tong: chon.reduce((t, c) => t * c.gia, 1) };
}

/** Xiên đội thắng: cửa 1·X·2 khớp tỷ số dự đoán của từng trận. Dưới 3 chân → null. */
export function xienTrongNgay(rows: readonly HangDuDoan[], toiDa = 5): Xien | null {
  return gom(
    rows.flatMap((h): ChanXien[] => {
      if (!h.sapDa || !h.du || !h.mot) return [];
      const cua = h.du[0] > h.du[1] ? 0 : h.du[0] === h.du[1] ? 1 : 2;
      return [{ h, cua, gia: h.mot[cua] }];
    }),
    toiDa,
  );
}

/** Dự đoán tài/xỉu 2,5 của một trận: `tip` "Over 2.5"/"Under 2.5", `keo` = [Tài, Xỉu]. */
export type TraTaiXiu = (slug: string) => { tip: string; keo: number[] } | null | undefined;

/** Xiên tài/xỉu 2,5 bàn. Trận tệp không ghi tài xỉu thì bỏ. Dưới 3 chân → null. */
export function xienTaiXiu(rows: readonly HangDuDoan[], tra: TraTaiXiu, toiDa = 5): Xien | null {
  return gom(
    rows.flatMap((h): ChanXien[] => {
      const p = h.sapDa ? tra(h.slug) : null;
      if (!p) return [];
      const tai = /over/i.test(p.tip);
      if (!tai && !/under/i.test(p.tip)) return [];
      const gia = p.keo[tai ? 0 : 1];
      return typeof gia === "number" ? [{ h, cua: tai ? "tai" : "xiu", gia }] : [];
    }),
    toiDa,
  );
}

export interface XienNgay {
  /** Khoá ngắn làm id khối: "xien-3", "xien-5", "tai-xiu", slug giải. */
  khoa: string;
  ten: string;
  xien: Xien;
}

/**
 * Các xiên của một ngày: xiên 3 + xiên 5 đội thắng, xiên tài/xỉu, rồi xiên riêng từng giải lớn
 * có đủ 3 trận. Ngày không gom nổi xiên nào → mảng rỗng.
 */
export function cacXienNgay(rows: readonly HangDuDoan[], tra: TraTaiXiu): XienNgay[] {
  const ba = xienTrongNgay(rows, 3);
  const nam = xienTrongNgay(rows, 5);
  const tx = xienTaiXiu(rows, tra);
  return [
    ...(ba ? [{ khoa: "xien-3", ten: "Xiên 3 đội thắng", xien: ba }] : []),
    // Chỉ có 3–4 chân thì xiên 5 trùng hoặc gần trùng xiên 3 → không lặp.
    ...(nam && nam.chan.length === 5 ? [{ khoa: "xien-5", ten: "Xiên 5 đội thắng", xien: nam }] : []),
    ...(tx ? [{ khoa: "tai-xiu", ten: `Xiên ${tx.chan.length} tài xỉu`, xien: tx }] : []),
    ...GIAI_TRANG.flatMap((g) => {
      const x = xienTrongNgay(rows.filter((h) => g.khop.test(h.giai)));
      return x ? [{ khoa: g.slug, ten: `Xiên ${x.chan.length} ${g.ten}`, xien: x }] : [];
    }),
  ];
}
