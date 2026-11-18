/**
 * Single source of brand identity (SPEC R3 — banhbong.net rebrand).
 * Import from here; never hardcode the retired brand name in app code.
 * Display name = "banhbong.net"; canonical host = www.
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
export const TAGLINE = "Dự đoán bóng đá mỗi ngày";
export const DEFAULT_TITLE = "Dự đoán bóng đá hôm nay, nhận định tỷ số miễn phí | banhbong.net";
/** Mô tả site DUY NHẤT (~150 ký tự) — meta description gốc, og/twitter, JSON-LD, manifest, llms.txt. */
export const SITE_DESCRIPTION =
  "banhbong.net: dự đoán tỷ số bóng đá mỗi ngày, Over/Under 2.5, phong độ hai đội, BXH và lịch thi đấu các giải lớn. Công khai thành tích, miễn phí.";
export const SAME_AS = [
  "https://t.me/banhbongnet",
  "https://facebook.com/xemthethaotructiep",
] as const;
/**
 * Bump khi đổi LAYOUT thẻ OG (/api/og/*) — gắn vào MỌI URL og:image để đổi URL,
 * buộc edge cache + Facebook/Telegram lấy thẻ mới (v3: sửa lệch trái, Nick 25/8;
 * v4: recap OG bỏ ảnh Haaland, Nick+Peter 13/9;
 * v5: thẻ recap chuyển sang khuôn KẾT QUẢ có logo 2 đội, Peter 13/9;
 * v6: chân thẻ analysis in tên tác giả thay "Banh Bóng Desk (AI)", Peter 15/9;
 * v8: ảnh guide + thẻ /api/og/guide bỏ chữ "tài xỉu" → Over/Under, Peter 14/11).
 */
export const OG_VERSION = 8;
