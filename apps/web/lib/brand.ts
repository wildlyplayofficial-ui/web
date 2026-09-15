/**
 * Single source of brand identity (SPEC R3 — banhbong.net rebrand).
 * Import from here; never hardcode the retired brand name in app code.
 * Display name = "banhbong.net" (Banh Bóng Network); canonical host = www.
 */
export const SITE_NAME = "banhbong.net";
/** Two-tone wordmark parts (ink + brand colour), used by header/footer/OG images. */
export const WORDMARK_A = "banhbong";
export const WORDMARK_B = ".net";
export const SITE_HOST = "www.banhbong.net";
export const SITE_URL = "https://www.banhbong.net";
/** Hai tác giả (Peter chốt 15/9): bài phân tích/nhận định/dự đoán mang tên CHU_TAM,
 *  bài tin tức + blog mang tên PETE. Thay cho "Banh Bóng Desk"/"Banh Bóng News".
 *  Worker chép hai tên này sang apps/worker/src/data/byline.json — sửa ở đây thì
 *  sửa cả ở đó, apps/worker/src/byline.test.ts sẽ đỏ nếu quên. Hồ sơ: lib/authors.ts. */
export const CHU_TAM = "Chú Tám Banh";
export const PETE = "Pete Nguyễn";
export const TAGLINE = "Banh Bóng Network";
export const DEFAULT_TITLE = "banhbong.net — Free Football Picks, Analysis & Betting Guides";
export const SAME_AS = [
  "https://t.me/banhbongnet",
  "https://facebook.com/xemthethaotructiep",
  "https://x.com/WildlyPlayGlob",
] as const;
/**
 * Bump khi đổi LAYOUT thẻ OG (/api/og/*) — gắn vào MỌI URL og:image để đổi URL,
 * buộc edge cache + Facebook/Telegram lấy thẻ mới (v3: sửa lệch trái, Nick 25/8;
 * v4: recap OG bỏ ảnh Haaland, Nick+Peter 13/9;
 * v5: thẻ recap chuyển sang khuôn KẾT QUẢ có logo 2 đội, Peter 13/9;
 * v6: chân thẻ analysis in tên tác giả thay "Banh Bóng Desk (AI)", Peter 15/9).
 */
export const OG_VERSION = 6;
