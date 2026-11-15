import DATA from "../data/giai-hub.json";
import type { HangDuDoan } from "./du-doan-hang";
import { GIAI_TRANG, tranCuaGiai, type GiaiTrang } from "./du-doan-loc";

/**
 * Dữ liệu hub 5 giải lớn (/competitions/{slug}) — Peter duyệt mẫu 15/11 ("đc á").
 * Tệp data/giai-hub.json do máy ~/.claude/tools/banhbong_predictz/giai_hub.py ghi mỗi lượt nap_repo:
 * Ngoại hạng Anh lấy Fantasy Premier League (có treo giò), 4 giải còn lại lấy FotMob (chỉ chấn thương).
 */
export interface CauThuTop {
  ten: string;
  doi: string;
  gt: number;
  /** "900 phút" hoặc "12 trận" (thủ môn FotMob). */
  phu: string;
}

export type LoaiVang = "i" | "s" | "d";

export interface DoiVang {
  doi: string;
  ds: { ten: string; loai: LoaiVang; ghiChu: string }[];
}

export interface KetQuaHub {
  nha: string;
  khach: string;
  bn: number;
  bk: number;
  gioUtc: string;
}

export interface HubGiaiData {
  nguon: string;
  capNhat: string;
  coTreoGio: boolean;
  vongXong: number | null;
  vongToi: number | null;
  top: Record<"ban" | "kienTao" | "xg" | "xa" | "cuuThua", CauThuTop[]>;
  vang: DoiVang[];
  ketQua: KetQuaHub[];
  /** FotMob: logo dự phòng theo tên đội (đội mới lên hạng chưa có trong bảng logo của web). */
  logo?: Record<string, string>;
  /** Chỉ Ngoại hạng Anh (FPL). */
  lichKho?: LichKho;
  sapTreo?: { ten: string; doi: string; ghiChu: string }[];
  phatDen?: { doi: string; ten: string }[];
}

export interface OLich {
  /** Mã 3 chữ đối thủ (FPL short_name). */
  dt: string;
  san: "N" | "K";
  /** Độ khó FPL 1–5. */
  kho: number;
}

export interface LichKho {
  vong: number[];
  hang: { doi: string; ma: string; tong: number; o: OLich[][] }[];
}

/** Mùa giải châu Âu theo ngày: từ tháng 7 sang mùa mới → "2026/27". */
export function muaGiai(bayGio = new Date()): string {
  const y = bayGio.getUTCFullYear();
  const dau = bayGio.getUTCMonth() >= 6 ? y : y - 1;
  return `${dau}/${String((dau + 1) % 100).padStart(2, "0")}`;
}

const HUB = DATA as unknown as Record<string, HubGiaiData>;

/** Giải có hub: slug BXH nằm trong tệp + có trang dự đoán theo giải. */
export function hubCuaGiai(slugBxh: string): { data: HubGiaiData; giai: GiaiTrang } | null {
  const data = HUB[slugBxh];
  const giai = GIAI_TRANG.find((g) => g.bxh === slugBxh);
  return data && giai ? { data, giai } : null;
}

export interface NgayDuDoan {
  ngay: string;
  ds: HangDuDoan[];
}

/** Trận có tỷ số dự đoán của giải, gom theo ngày giờ VN (đã xếp theo giờ đá). */
export function duDoanTheoNgay(hang: readonly HangDuDoan[], g: GiaiTrang, homNay: string): NgayDuDoan[] {
  const nhom = new Map<string, HangDuDoan[]>();
  for (const h of tranCuaGiai(hang, g, homNay)) {
    if (!h.du) continue;
    nhom.set(h.ngay, [...(nhom.get(h.ngay) ?? []), h]);
  }
  return [...nhom.entries()].map(([ngay, ds]) => ({ ngay, ds }));
}
