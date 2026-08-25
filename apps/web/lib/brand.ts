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
/** Byline bài do toà soạn viết: analysis_articles + bài tin đăng tay (news_items). */
export const DESK = "Banh Bóng Desk";
/** Byline bài tin do máy sinh (news_items type preview/result/standings).
 *  Worker chép hai tên này sang apps/worker/src/data/byline.json — sửa ở đây thì
 *  sửa cả ở đó, apps/worker/src/byline.test.ts sẽ đỏ nếu quên. */
export const NEWS_DESK = "Banh Bóng News";
export const TAGLINE = "Banh Bóng Network";
export const DEFAULT_TITLE = "banhbong.net — Free Football Picks, Analysis & Betting Guides";
export const SAME_AS = [
  "https://t.me/banhbongnet",
  "https://facebook.com/xemthethaotructiep",
  "https://x.com/WildlyPlayGlob",
] as const;
/**
 * Bump khi đổi LAYOUT thẻ OG (/api/og/*) — gắn vào MỌI URL og:image để đổi URL,
 * buộc edge cache + Facebook/Telegram lấy thẻ mới (v3: sửa lệch trái, Nick 25/8).
 */
export const OG_VERSION = 3;
