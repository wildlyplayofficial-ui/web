import { OG_VERSION } from "@/lib/brand";
import type { Lang } from "@/lib/i18n";

/**
 * Bìa vẽ tay cho cụm guide tài xỉu/kèo tiếng Việt. Thẻ sinh runtime (/api/og/guide)
 * chỉ có tiêu đề; mấy bài này cần MỐC SỐ trên bìa, mà mốc phải đúng bài — bìa của
 * bài 2.25 mà khoe 2.5 là chỉ vào bài hàng xóm. Nên số vẽ sẵn theo từng slug, không
 * sinh động. Chữ trên bìa là tiếng Việt → chỉ dùng cho lang "vi".
 *
 * Để dưới /images/ vì proxy.ts CHỈ miễn trừ icons|images|brand — /og/* bị lớp
 * chuyển ngôn ngữ nuốt và trả 404 (thử tay 1/9: /og/player.png cũng đang 404).
 *
 * Ở chung một tệp vì CẢ TRANG BÀI LẪN TRANG DANH SÁCH đều cần. Tách hai bản là
 * để hai bảng lệch nhau — đúng lỗi bảng tên đội đã dính hồi 29/8.
 */
export const BIA_VI = new Set([
  "keo-tai-xiu-2-2-5-la-gi",
  "keo-tai-xiu-2-5-la-gi",
  "keo-tai-xiu-2-5-3-la-gi",
  "keo-tai-xiu-3-la-gi",
  "keo-tai-xiu-3-3-5-la-gi",
  "keo-tai-xiu-3-5-4-la-gi",
  "keo-1x2-la-gi",
  "keo-hiep-1-la-gi",
  "keo-the-phat-la-gi",
  // Đợt 2 (1/9): 13 bài Hướng dẫn tiếng Việt còn lại chưa có ảnh nào.
  "keo-1-4-la-gi",
  "keo-0-5-la-gi",
  "keo-3-4-la-gi",
  "keo-1-1-4-la-gi",
  "keo-1-5-la-gi",
  "keo-1-3-4-la-gi",
  "keo-0-25-va-0-75",
  "keo-goc-8-5-la-gi",
  "keo-goc-9-5-va-10-5",
  "keo-goc-lech-la-gi",
  "keo-phat-goc-la-gi",
  "tai-xiu-la-gi-cach-doc-keo-over-under",
  "vi-sao-ty-le-keo-khac-nhau-giua-cac-nguon",
]);

/**
 * Sơ đồ minh hoạ riêng (PNG) cho 9 bài kèo — trực quan hơn ảnh bìa chung nên ở
 * trang bài ưu tiên hiện cái này trước, xem hero trong guides/[slug]/page.tsx.
 * File tại /images/guides/<slug>.png, 1200x630. Ảnh chưa vẽ xong lúc viết mã
 * này — bình thường, người khác đang làm riêng.
 */
export const SO_DO_VI = new Set([
  "keo-tai-xiu-2-2-5-la-gi",
  "keo-tai-xiu-2-5-la-gi",
  "keo-tai-xiu-2-5-3-la-gi",
  "keo-tai-xiu-3-la-gi",
  "keo-tai-xiu-3-3-5-la-gi",
  "keo-tai-xiu-3-5-4-la-gi",
  "keo-1x2-la-gi",
  "keo-hiep-1-la-gi",
  "keo-the-phat-la-gi",
]);

/** Ảnh bìa tĩnh nếu bài có, không thì rơi về thẻ sinh runtime. Bản CÓ tiêu đề. */
export function biaUrl(slug: string, lang: Lang, title: string): string {
  if (hasBia(slug, lang)) return `/images/huong-dan/${slug}.jpg?v=${OG_VERSION}`;
  return `/api/og/guide?slug=${slug}&title=${encodeURIComponent(title)}&locale=${lang}&v=${OG_VERSION}`;
}

/**
 * Bản KHÔNG tiêu đề, chỉ dùng làm ảnh đầu bài. Cùng khuôn, cùng số, bỏ đúng dòng
 * tiêu đề — vì ảnh nằm ngay dưới thẻ H1, in tiêu đề lần nữa là lặp chữ.
 * Bản có tiêu đề vẫn giữ cho og:image: lúc chia sẻ ra Telegram/Facebook không có
 * H1 bên cạnh, bỏ chữ là mất nghĩa.
 * Chỉ có cho bài KHÔNG nằm trong SO_DO_VI — 9 bài kia đã dùng sơ đồ riêng làm hero.
 */
export function biaKhongChuUrl(slug: string, lang: Lang): string | null {
  if (!hasBia(slug, lang) || SO_DO_VI.has(slug)) return null;
  return `/images/huong-dan-bai/${slug}.jpg?v=${OG_VERSION}`;
}

/**
 * Trang danh sách dùng cái này chứ KHÔNG dùng biaUrl: ở đó thẻ sinh runtime là
 * ảnh 1200×630 nặng ~190KB, nhân với mấy chục bài trên một trang thì nặng vô lý.
 * Bài chưa có bìa tĩnh thì để ô màu thương hiệu, không gọi mạng.
 */
export function hasBia(slug: string, lang: Lang): boolean {
  return lang === "vi" && BIA_VI.has(slug);
}
