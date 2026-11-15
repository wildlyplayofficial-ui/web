import DATA from "../data/giai-hub.json";
import type { HangDuDoan } from "./du-doan-hang";
import { GIAI_TRANG, tranCuaGiai, type GiaiTrang } from "./du-doan-loc";
import { badgeNho, teamBadge } from "./team-badges";

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

const tachChu = (s: string): string[] =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\butd\b/g, "united")
    .replace(/\bnott'?m\b/g, "nottingham")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Tên ngắn của tệp dự đoán ("Man City", "Leeds", "Ipswich") → tên đầy đủ trong danh sách ứng viên
 * ("Manchester City", "Leeds United", "Ipswich Town"): mỗi chữ của tên ngắn là đầu một chữ của tên
 * dài, đúng thứ tự. Chỉ nhận khi khớp đúng MỘT ứng viên (tránh "Man" ra cả Man City lẫn Man Utd).
 */
export function tenDayDu(ten: string, ungVien: readonly string[]): string | null {
  const a = tachChu(ten);
  if (a.length === 0) return null;
  const khop = [...new Set(ungVien)].filter((u) => {
    const b = tachChu(u);
    let j = 0;
    for (const chu of a) {
      while (j < b.length && !b[j].startsWith(chu)) j++;
      if (j === b.length) return false;
      j++;
    }
    return true;
  });
  return khop.length === 1 ? khop[0] : null;
}

/** Logo đội ở hub: bảng logo web → logo nguồn → logo của tên đầy đủ (BXH/kết quả/FotMob) → null (chữ cái). */
export function logoHub(ten: string, logoNguon: string | null, ungVien: readonly string[], du?: Record<string, string>): string | null {
  const truc = badgeNho(teamBadge(ten) ?? logoNguon) ?? du?.[ten];
  if (truc) return truc;
  const day = tenDayDu(ten, ungVien);
  return day ? (badgeNho(teamBadge(day)) ?? du?.[day] ?? null) : null;
}
