/**
 * Số liệu thêm cho trang trận (10/11): lịch sử đối đầu, vị trí bảng xếp hạng, các trận gần nhất.
 * Hàm THUẦN — mọi con số tính lại từ danh sách trận, câu chữ tự viết. Thiếu trường nào thì
 * khối đó không hiện. Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import { tenSo } from "./du-doan-cham";
import type { KQ } from "./phong-do";

/** Một trận đã đá; `ngay` = YYYY-MM-DD, tên đội theo tên gốc trong tệp. */
export interface TranGanDay { ngay: string; nha: string; khach: string; tsn: number; tsk: number }
/** Một lần gặp nhau; `mua` kiểu "2025/26". */
export interface DoiDauMua { mua: string; nha: string; khach: string; tsn: number; tsk: number }
export interface DongBangXep { hang: number; tran: number; t: number; h: number; b: number; bt: number; bb: number; diem: number }

/** Các trường tuỳ chọn của một dòng tệp tuần; danh sách đều xếp MỚI NHẤT TRƯỚC. */
export interface SoLieuTran {
  h2h?: DoiDauMua[];
  /** Dòng bảng xếp hạng của đội nhà / đội khách. */
  bxn?: DongBangXep;
  bxk?: DongBangXep;
  /** Tối đa 10 trận gần nhất của đội nhà / đội khách. */
  gn?: TranGanDay[];
  gk?: TranGanDay[];
}

const SO_PHONG_DO = 5;
/** Bản sao xếp mới nhất trước (ngày YYYY-MM-DD so chuỗi là đủ). */
export const moiTruoc = (ds: readonly TranGanDay[]) => [...ds].sort((a, b) => b.ngay.localeCompare(a.ngay));

const HAN_MOI_NGAY = 30;
/**
 * Danh sách "10 trận gần nhất" chỉ dùng được khi trận mới nhất cách ngày đá ≤30 ngày.
 * Tệp 10/11: 10/136 danh sách dừng từ tháng 8–10 (Serie C, Uganda, Colombia) trong khi đội vẫn
 * đá đều — hiện ra sẽ thành "gần nhất" sai và dải phong độ lệch chuỗi trên trang danh sách.
 */
export function conMoi(ds: TranGanDay[] | undefined, ngayDa: string): TranGanDay[] | undefined {
  const moiNhat = ds?.length ? moiTruoc(ds)[0].ngay : null;
  if (!moiNhat) return undefined;
  const cach = (Date.parse(`${ngayDa}T00:00:00Z`) - Date.parse(`${moiNhat}T00:00:00Z`)) / 864e5;
  return cach <= HAN_MOI_NGAY ? ds : undefined;
}

/** Kết quả trận nhìn từ `doi`; đội không đá trận này → null. */
export function kqCuaDoi(t: TranGanDay, doi: string): KQ | null {
  const ten = tenSo(doi);
  const laNha = tenSo(t.nha) === ten;
  if (!laNha && tenSo(t.khach) !== ten) return null;
  const [ghi, thung] = laNha ? [t.tsn, t.tsk] : [t.tsk, t.tsn];
  return ghi > thung ? "T" : ghi < thung ? "B" : "H";
}

/**
 * Dải phong độ 5 trận gần nhất theo quy ước MÀN HÌNH: trái = trận cũ nhất, phải = trận mới
 * nhất. Chưa đủ 5 trận → null (không hiện ô, như lib/phong-do.ts).
 */
export function phongDoTuTran(ds: readonly TranGanDay[] | undefined, doi: string): KQ[] | null {
  const kq = moiTruoc(ds ?? []).map((t) => kqCuaDoi(t, doi)).filter((k): k is KQ => k !== null).slice(0, SO_PHONG_DO);
  return kq.length === SO_PHONG_DO ? kq.reverse() : null;
}

export interface ThanhTich { tran: number; t: number; h: number; b: number; ghi: number; thung: number }

/** Cộng thành tích của `doi` trong danh sách; `san` = chỉ tính trận đội đá sân nhà / sân khách. */
export function thanhTich(ds: readonly TranGanDay[], doi: string, san?: "nha" | "khach"): ThanhTich {
  const ten = tenSo(doi);
  const tong: ThanhTich = { tran: 0, t: 0, h: 0, b: 0, ghi: 0, thung: 0 };
  return ds.reduce((a, t) => {
    const kq = kqCuaDoi(t, doi);
    const laNha = tenSo(t.nha) === ten;
    if (!kq || (san && (san === "nha") !== laNha)) return a;
    return {
      tran: a.tran + 1,
      t: a.t + (kq === "T" ? 1 : 0),
      h: a.h + (kq === "H" ? 1 : 0),
      b: a.b + (kq === "B" ? 1 : 0),
      ghi: a.ghi + (laNha ? t.tsn : t.tsk),
      thung: a.thung + (laNha ? t.tsk : t.tsn),
    };
  }, tong);
}

/** "Sân nhà: 4 trận, 1 thắng · 2 hòa · 1 thua"; không có trận nào ở sân đó → null. */
export function cauSan(tt: ThanhTich, san: "nha" | "khach"): string | null {
  if (tt.tran === 0) return null;
  return `${san === "nha" ? "Sân nhà" : "Sân khách"}: ${tt.tran} trận, ${tt.t} thắng · ${tt.h} hòa · ${tt.b} thua`;
}

/** "Trung bình mỗi trận: ghi 1.2 bàn, thủng lưới 1.7 bàn" (một số lẻ); không có trận → null. */
export function cauBanThang(tt: ThanhTich): string | null {
  if (tt.tran === 0) return null;
  const tb = (x: number) => (x / tt.tran).toFixed(1);
  return `Trung bình mỗi trận: ghi ${tb(tt.ghi)} bàn, thủng lưới ${tb(tt.thung)} bàn`;
}

/** "31/10" từ YYYY-MM-DD. */
export const ngayNgan = (ngay: string) => `${Number(ngay.slice(8, 10))}/${Number(ngay.slice(5, 7))}`;
