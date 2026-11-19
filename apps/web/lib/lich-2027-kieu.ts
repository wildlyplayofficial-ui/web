/** Kiểu dữ liệu chung cho các trang lịch thi đấu 2027 (hub, C1, World Cup nữ, SEA Games). */
export interface KhoiNoiDung {
  id: string;
  tieuDe: string;
  doan?: string[];
  bang?: { cot: string[]; hang: string[][] };
  danhSach?: string[];
}

export interface DuLieuTrang {
  duong: string;
  h1: string;
  moTa: string;
  /** Dòng phụ trên ảnh chia sẻ. */
  ogPhu: string;
  capNhat: string;
  moDau: string;
  khoi: KhoiNoiDung[];
  hoiDap: { hoi: string; dap: string }[];
  nguon: { ten: string; url: string }[];
  lienKetDuDoan: { href: string; ten: string }[];
}
