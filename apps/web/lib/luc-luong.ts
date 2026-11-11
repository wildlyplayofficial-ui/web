import DATA from "../data/luc-luong.json";

/**
 * Khối "Lực lượng" trang /du-doan/{slug} (Peter gật 11/11/2026).
 * KHÔNG có nguồn máy nào cho tin chấn thương/treo giò, nên tệp data/luc-luong.json điền TAY:
 * khoá = slug trận, mỗi cầu thủ một dòng, bắt buộc ghi nguồn. Trận không có trong tệp → khối ẩn.
 *
 * {
 *   "nhan-dinh-a-vs-b-17-11-2026": {
 *     "nha":   [{ "ten": "Tên cầu thủ", "lyDo": "chấn thương đầu gối" }],
 *     "khach": [],
 *     "nguon": "VFF", "url": "https://...", "capNhat": "2026-11-16"
 *   }
 * }
 * Đội không ai vắng thì để mảng rỗng — trang ghi "Chưa có thông tin vắng mặt".
 */
export interface CauThuVang {
  ten: string;
  lyDo: string;
}

export interface LucLuong {
  nha: CauThuVang[];
  khach: CauThuVang[];
  nguon: string;
  url?: string;
  /** YYYY-MM-DD */
  capNhat: string;
}

const BANG = DATA as Record<string, LucLuong>;

export function lucLuongCua(slug: string): LucLuong | null {
  const x = BANG[slug];
  return x && x.nguon ? x : null;
}
