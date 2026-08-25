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
export const DESK = "Banh Bóng Desk";
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
