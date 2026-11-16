/**
 * MỘT trang chính (hub) cho mỗi giải — Peter gật gộp 16/11/2026.
 *
 * Bối cảnh: Google bỏ chỉ mục gần hết site, mỗi giải lại có 4-5 trang na ná nhau
 * (/du-doan/{giai}, /thong-so/{giai}, /form/{giai}, /competitions/{slug}). Gộp lại:
 * - 5 giải lớn + Cúp C1: hub = /competitions/{slug} (lịch, kết quả, BXH, dự đoán theo ngày);
 *   bảng phong độ + thông số xG gắn thêm vào hub. /du-doan/{giai}, /thong-so/{giai},
 *   /form/{giai} 301 về đây (luật ở next.config.ts).
 * - Giải chỉ có số liệu đội (Hạng Nhất Anh, Eredivisie…): hub = /thong-so/{giai}, bảng
 *   phong độ gắn vào đó; /form/{giai} 301 về /thong-so/{giai}.
 *
 * Tệp THUẦN, không import gì — next.config.ts đọc trực tiếp để sinh luật 301.
 */
export const HUB_GIAI: Readonly<Record<string, string>> = {
  "ngoai-hang-anh": "/competitions/premier-league",
  "la-liga": "/competitions/la-liga",
  "serie-a": "/competitions/serie-a",
  bundesliga: "/competitions/bundesliga",
  "ligue-1": "/competitions/ligue-1",
  "cup-c1": "/competitions/champions-league",
};

/** Đường tới hub của giải (slug kiểu /du-doan/{giai}); giải không có hub /competitions thì trả `khac`. */
export const duongHubGiai = (slug: string, khac: string): string => HUB_GIAI[slug] ?? khac;

/** Neo trong hub tới hai khối gộp vào (bảng phong độ, thông số xG). */
export const NEO_PHONG_DO = "phong-do";
export const NEO_THONG_SO = "thong-so-doi";
