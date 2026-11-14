/**
 * Trang dự đoán lọc theo NGÀY và theo GIẢI (Peter 11/11/2026, học PredictZ "Tomorrow's Tips" +
 * thanh England/Spain/Germany): mỗi ngày, mỗi giải lớn một link riêng để Google lập chỉ mục,
 * thay cho tab bấm trong trang. Cùng nằm dưới /du-doan/{slug} với trang trận (slug trận luôn
 * chứa ngày nên không trùng). Hàm THUẦN, import tương đối để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { ngayThang, thuVN } from "./du-doan-tran";

export const lechNgay = (khoa: string, n: number) =>
  new Date(Date.parse(`${khoa}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Slug theo thứ, chỉ số trùng getUTCDay (0 = Chủ Nhật). */
const SLUG_THU = ["chu-nhat", "thu-hai", "thu-ba", "thu-tu", "thu-nam", "thu-sau", "thu-bay"] as const;
export const NGAY_MAI = "ngay-mai";

/** Link của một ngày: hôm nay = /du-doan, ngày mai = /du-doan/ngay-mai, còn lại theo thứ. */
export function duongDanNgay(ngay: string, homNay: string): string {
  if (ngay === homNay) return "/du-doan";
  if (ngay === lechNgay(homNay, 1)) return `/du-doan/${NGAY_MAI}`;
  return `/du-doan/${SLUG_THU[new Date(`${ngay}T00:00:00Z`).getUTCDay()]}`;
}

/** Ngày mà slug chỉ tới: "ngay-mai" → mai; "thu-bay" → thứ Bảy gần nhất từ mai trở đi. Không phải slug ngày → null. */
export function ngayTuSlug(slug: string, homNay: string): string | null {
  if (slug === NGAY_MAI) return lechNgay(homNay, 1);
  const thu = SLUG_THU.indexOf(slug as (typeof SLUG_THU)[number]);
  if (thu < 0) return null;
  for (let n = 1; n <= 7; n++) {
    const k = lechNgay(homNay, n);
    if (new Date(`${k}T00:00:00Z`).getUTCDay() === thu) return k;
  }
  return null;
}

/** Tên ngày trong tiêu đề: "ngày mai 12/11" / "Thứ Bảy 14/11". */
export function tenNgay(ngay: string, homNay: string): string {
  return ngay === lechNgay(homNay, 1) ? `ngày mai ${ngayThang(ngay)}` : `${thuVN(ngay)} ${ngayThang(ngay)}`;
}

export function metaNgay(ngay: string, homNay: string): { tieuDe: string; moTa: string } {
  const ten = tenNgay(ngay, homNay);
  return {
    tieuDe: `Dự đoán bóng đá ${ten}`,
    moTa: `Dự đoán tỷ số từng trận ${ten}/${ngay.slice(0, 4)} theo giờ Việt Nam: tỷ lệ 1·X·2, tài xỉu, phong độ 5 trận gần nhất của hai đội.`,
  };
}

export interface GiaiTrang {
  slug: string;
  /** Tên hiện trên trang. */
  ten: string;
  /** Khớp tên giải của dòng dự đoán (tên Việt hoặc tên gốc). */
  khop: RegExp;
  /** Slug trang BXH /competitions/{slug}; giải không có BXH thì null. */
  bxh: string | null;
}

/** Giải có trang dự đoán riêng. Thêm giải: thêm một dòng (nhớ slug không chứa ngày). */
export const GIAI_TRANG: readonly GiaiTrang[] = [
  { slug: "ngoai-hang-anh", ten: "Ngoại hạng Anh", khop: /^(ngoại hạng anh|(english |england )?premier league)$/i, bxh: "premier-league" },
  { slug: "la-liga", ten: "La Liga", khop: /^(spain )?la ?liga$/i, bxh: "la-liga" },
  { slug: "serie-a", ten: "Serie A", khop: /^(italy )?serie a$/i, bxh: "serie-a" },
  { slug: "bundesliga", ten: "Bundesliga", khop: /^(germany )?bundesliga$/i, bxh: "bundesliga" },
  { slug: "ligue-1", ten: "Ligue 1", khop: /^(france )?ligue 1$/i, bxh: "ligue-1" },
  { slug: "cup-c1", ten: "Cúp C1 châu Âu", khop: /champions league|cúp c1/i, bxh: "champions-league" },
  { slug: "nations-league", ten: "Nations League", khop: /^(uefa )?nations league/i, bxh: null },
];

export const giaiTuSlug = (slug: string): GiaiTrang | null => GIAI_TRANG.find((g) => g.slug === slug) ?? null;

/** Trận chưa qua của một giải (từ hôm nay trở đi), xếp theo giờ đá. */
export function tranCuaGiai(hang: readonly HangDuDoan[], g: GiaiTrang, homNay: string): HangDuDoan[] {
  return hang
    .filter((h) => g.khop.test(h.giai) && h.ngay >= homNay)
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

export function metaGiai(g: GiaiTrang): { tieuDe: string; moTa: string } {
  return {
    tieuDe: `Dự đoán ${g.ten} vòng tới`,
    moTa: `Dự đoán tỷ số các trận ${g.ten} sắp đá theo giờ Việt Nam: tỷ lệ 1·X·2, tài xỉu, phong độ 5 trận gần nhất, cập nhật trước giờ bóng lăn.`,
  };
}
