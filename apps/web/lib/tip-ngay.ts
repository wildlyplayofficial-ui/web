/**
 * Trang gom theo loại kèo cho một ngày (Peter gật 14/11): "Over/Under hôm nay", "Cả 2 đội ghi bàn hôm nay",
 * "Tỷ số hôm nay". Dữ liệu là dòng dự đoán sẵn có (HangDuDoan) + khối thị trường phụ trong tệp tuần
 * (pOu · pBtts · pCs) — chỉ lọc và gom, không tính thêm. Hàm THUẦN, import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";
import type { ThiTruongPhu } from "./tran-keo-phu";

export type LoaiTip = "tai-xiu" | "hai-doi-ghi-ban" | "ty-so";
/** Thêm trang "Cả 2 đội ghi bàn + thắng" (nhà/khách thắng và cả hai đội ghi bàn); chưa có trang theo giải nên tách khỏi LoaiTip. */
export type LoaiTipNgay = LoaiTip | "thang-hai-doi-ghi-ban";

/** Phần tệp tuần của một trận mà ba loại tip cần. */
export interface KeoPhuTip {
  pBtts?: ThiTruongPhu;
  pOu?: ThiTruongPhu;
  pCs?: ThiTruongPhu;
  /** Kết quả + cả hai đội ghi bàn: nY = nhà thắng và có, kY = khách thắng và có. */
  pKqBtts?: { nY: number; kY: number };
}

export interface DongTip {
  h: HangDuDoan;
  /** Nhãn nhóm: "Over 2.5" · "Under 2.5" · "Có" · "Không" · "2-1". */
  nhom: string;
  /** Tỷ lệ của cửa được chọn; null = tệp không ghi. */
  keo: number | null;
  /** Chuỗi 5 trận (CŨ TRƯỚC, mới nhất cuối) của đội nhà / khách; null = không có. Over/Under: true = Tài. BTTS: true = cả hai ghi. */
  chuoiNha: boolean[] | null;
  chuoiKhach: boolean[] | null;
}

const duong = (n: number) => (Number.isFinite(n) && n > 0 ? n : null);
const chuoi = (s: string | undefined, dat: "Y" | "O"): boolean[] | null => {
  if (!s || ![...s].every((c) => c === dat || c === (dat === "Y" ? "N" : "U"))) return null;
  return [...s].map((c) => c === dat);
};

/** Over/Under: ưu tiên khối pOu, thiếu thì lấy chữ "Over 2.5" trong dòng; không có gì → null. */
function dongTaiXiu(h: HangDuDoan, k: KeoPhuTip | undefined): DongTip | null {
  const tai = k?.pOu ? /over/i.test(k.pOu.tip) : h.taiXiu ? /^(tài|over)/i.test(h.taiXiu) : null;
  if (tai === null) return null;
  const keo = k?.pOu?.keo.length === 2 ? duong(k.pOu.keo[tai ? 0 : 1]) : null;
  return { h, nhom: tai ? "Over 2.5" : "Under 2.5", keo, chuoiNha: chuoi(k?.pOu?.h5, "O"), chuoiKhach: chuoi(k?.pOu?.a5, "O") };
}

function dongHaiDoi(h: HangDuDoan, k: KeoPhuTip | undefined): DongTip | null {
  const co = k?.pBtts ? /yes/i.test(k.pBtts.tip) : h.haiDoiGhi;
  if (co === null || co === undefined) return null;
  const keo = k?.pBtts?.keo.length === 2 ? duong(k.pBtts.keo[co ? 0 : 1]) : null;
  return { h, nhom: co ? "Có" : "Không", keo, chuoiNha: chuoi(k?.pBtts?.h5, "Y"), chuoiKhach: chuoi(k?.pBtts?.a5, "Y") };
}

/** Tỷ số: ưu tiên khối pCs ("Home 2-0"), thiếu thì lấy tỷ số dự đoán của dòng. */
function dongTySo(h: HangDuDoan, k: KeoPhuTip | undefined): DongTip | null {
  const m = k?.pCs?.tip.match(/(\d+)\s*-\s*(\d+)/);
  const so = m ? `${m[1]}-${m[2]}` : h.du ? `${h.du[0]}-${h.du[1]}` : null;
  if (!so) return null;
  return { h, nhom: so, keo: k?.pCs?.keo.length ? duong(k.pCs.keo[0]) : null, chuoiNha: null, chuoiKhach: null };
}

/** Cả hai đội ghi bàn + thắng: chọn cửa thắng có tỷ lệ thấp hơn trong (nhà thắng + có, khách thắng + có). */
function dongThangHaiDoi(h: HangDuDoan, k: KeoPhuTip | undefined): DongTip | null {
  const g = k?.pKqBtts;
  const n = duong(g?.nY ?? NaN);
  const kh = duong(g?.kY ?? NaN);
  if (n === null || kh === null) return null;
  const nha = n <= kh;
  return { h, nhom: nha ? "Nhà thắng" : "Khách thắng", keo: nha ? n : kh, chuoiNha: chuoi(k?.pBtts?.h5, "Y"), chuoiKhach: chuoi(k?.pBtts?.a5, "Y") };
}

const DUNG = { "tai-xiu": dongTaiXiu, "hai-doi-ghi-ban": dongHaiDoi, "ty-so": dongTySo, "thang-hai-doi-ghi-ban": dongThangHaiDoi } as const;

/** Các dòng của một loại tip trong `ngay` (YYYY-MM-DD giờ VN), xếp theo giờ đá rồi tên đội nhà. */
export function dongTipNgay(hang: readonly HangDuDoan[], ngay: string, loai: LoaiTipNgay, keoPhu: (slug: string) => KeoPhuTip | null | undefined): DongTip[] {
  return hang
    .filter((h) => h.ngay === ngay)
    .flatMap((h) => {
      const d = DUNG[loai](h, keoPhu(h.slug) ?? undefined);
      return d ? [d] : [];
    })
    .sort((a, b) => a.h.kickoffUtc.localeCompare(b.h.kickoffUtc) || a.h.nha.localeCompare(b.h.nha));
}

/** Đếm theo nhãn nhóm, nhiều nhất trước (hoà thì theo thứ tự xuất hiện). */
export function demNhom(ds: readonly DongTip[]): { nhom: string; so: number }[] {
  const m = new Map<string, number>();
  for (const d of ds) m.set(d.nhom, (m.get(d.nhom) ?? 0) + 1);
  return [...m].map(([nhom, so]) => ({ nhom, so })).sort((a, b) => b.so - a.so);
}
