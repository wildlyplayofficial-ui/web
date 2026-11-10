/**
 * Nguồn dự đoán từng trận cho hub /du-doan.
 *
 * Cột `analysis_articles.du_doan` (migration add_analysis_du_doan.sql) CHƯA chạy
 * trên CSDL — máy không có quyền DDL. Trong lúc chờ, dự đoán gõ trong
 * lib/data/du-doan.json, khoá theo slug bài. Cột có số thì cột thắng; tệp chỉ
 * bù tên tiếng Việt + ảnh cầu thủ cho phần hiển thị.
 *
 * Import TƯƠNG ĐỐI (không "@/") để vitest chạy được không cần cấu hình alias.
 */
import tep from "./data/du-doan.json";
import type { AnalysisArticle, DuDoan } from "./types";

/** Dự đoán + phần hiển thị chỉ có trong tệp (tên tiếng Việt, ảnh cầu thủ). */
export interface DuDoanDayDu extends DuDoan {
  /** Tên hiện cho người đọc. Thiếu thì dùng `home`/`away` (tên nguồn tỷ số). */
  home_vi?: string;
  away_vi?: string;
  /** Ảnh cầu thủ vẽ hoạt hình, nền trong. Thiếu thì chỉ hiện logo. */
  anh_nha?: string;
  anh_khach?: string;
  /** Dòng ghi nguồn ảnh cầu thủ — BẮT BUỘC khi ảnh theo giấy phép CC BY-SA. */
  credit_anh?: string;
}

const TEP: Record<string, DuDoanDayDu> = tep;

export function duDoanCua(
  a: Pick<AnalysisArticle, "slug" | "du_doan">,
  nguon: Record<string, DuDoanDayDu> = TEP,
): DuDoanDayDu | null {
  const tuTep = nguon[a.slug];
  if (a.du_doan) return { ...tuTep, ...a.du_doan };
  return tuTep ?? null;
}

export const tenNha = (d: DuDoanDayDu) => d.home_vi ?? d.home;
export const tenKhach = (d: DuDoanDayDu) => d.away_vi ?? d.away;
