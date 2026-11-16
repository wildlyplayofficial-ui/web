import { GIAI_TRANG, type GiaiTrang } from "./du-doan-loc";
import { duongHubGiai } from "./duong-hub-giai";

/**
 * Từ khoá nhận ra bài nói về giải nào (bài blog/phân tích tiếng Việt hay viết đủ kiểu).
 * Dùng để đưa link "Dự đoán {giải} vòng tới" lên đầu khối link cuối bài.
 */
const TU_KHOA: Record<string, RegExp> = {
  "ngoai-hang-anh": /ngoại hạng anh|premier league|\bepl\b|ngoai-hang-anh/i,
  "la-liga": /la ?liga/i,
  "serie-a": /serie[ -]a\b/i,
  bundesliga: /bundesliga/i,
  "ligue-1": /ligue[ -]1\b/i,
  "cup-c1": /cúp c1|cup[ -]c1|champions league/i,
};

/** Giải đầu tiên (theo thứ tự GIAI_TRANG) mà tiêu đề/slug bài nhắc tới; không có thì null. */
export function giaiTrongBai(chu: string): GiaiTrang | null {
  return GIAI_TRANG.find((g) => TU_KHOA[g.slug]?.test(chu)) ?? null;
}

/** Danh sách link dự đoán cuối bài: giải của bài (nếu có) lên đầu, rồi các giải lớn còn lại. */
export function linkDuDoanCuoiBai(chu: string): { href: string; ten: string }[] {
  const chinh = giaiTrongBai(chu);
  const lon = GIAI_TRANG.filter((g) => g.slug in TU_KHOA);
  const thuTu = chinh ? [chinh, ...lon.filter((g) => g.slug !== chinh.slug)] : lon;
  // 17/11: trỏ thẳng hub giải — /du-doan/{giai} giờ 301 sang /competitions/{slug}.
  return thuTu.map((g) => ({ href: duongHubGiai(g.slug, `/du-doan/${g.slug}`), ten: `Dự đoán ${g.ten}` }));
}
