import { SITE_NAME } from "./brand";

/**
 * Tác giả ký tên dưới mỗi trận dự đoán. 11/11/2026 từng chia 5 chuyên gia theo giải (neo trên
 * /about); 16/11/2026 Peter chốt gom về MỘT người thật: Pete Nguyễn, hồ sơ /tac-gia/pete-nguyen.
 * Tên viết tay ở đây (không kéo lib/brand PETE) để file khỏi kéo cả brand vào test.
 */
export interface ChuyenGia {
  slug: string;
  ten: string;
  gioiThieu: string;
  sameAs: readonly string[];
}

export const PETE_TAC_GIA: ChuyenGia = {
  slug: "pete-nguyen",
  ten: "Pete Nguyễn",
  gioiThieu: "Biên tập nhận định trước trận, tin tức và blog bóng đá của banhbong.net.",
  sameAs: ["https://www.linkedin.com/in/pete-nguy%E1%BB%85n-518324437"],
};

/** Trang hồ sơ tác giả. */
export const duongDanChuyenGia = (c: ChuyenGia) => `/tac-gia/${c.slug}`;

/** Person cho JSON-LD (author của trang trận), @id trùng trang hồ sơ để Google gộp. */
export function nguoiChuyenGia(c: ChuyenGia, base: string) {
  const url = `${base}${duongDanChuyenGia(c)}`;
  return {
    "@type": "Person",
    "@id": url,
    name: c.ten,
    url,
    description: c.gioiThieu,
    sameAs: [...c.sameAs],
    worksFor: { "@type": "Organization", name: SITE_NAME, url: base },
  };
}

/** Tác giả của một trận: mọi trận đều Pete Nguyễn (Peter 16/11/2026). */
export function chuyenGiaCua(_h: { giai: string; nha: string; khach: string }): ChuyenGia {
  return PETE_TAC_GIA;
}

/** Tên cũ của tác giả nhận định (lib/brand.ts CHU_TAM). */
const CHU_TAM = "Chú Tám Banh";

/** Tên ký "desk" cũ còn nằm trong DB (news_items, analysis_articles) — Peter 17/11/2026 gom hết về Pete Nguyễn. */
const TEN_DESK_CU = ["Banh Bóng Desk", "Banh Bóng News", "WildlyPlay Desk"];

/** Bài nhận định ký "Chú Tám Banh" → ký Pete Nguyễn, đổi cả chữ "Chú Tám" trong thân bài.
 *  Bài ký tên desk cũ → ký Pete Nguyễn (thân bài giữ nguyên). Bài tác giả khác giữ nguyên. */
export function ganChuyenGia<T extends { byline: string; body?: string }>(a: T): T {
  const ten = PETE_TAC_GIA.ten;
  if (TEN_DESK_CU.includes(a.byline)) return { ...a, byline: ten };
  if (a.byline !== CHU_TAM) return a;
  return { ...a, byline: ten, ...(a.body ? { body: a.body.replace(/Chú Tám( Banh)?/g, ten) } : {}) };
}
