/**
 * Chỉ số theo đội cho /thong-so, chia NHÓM kiểu FotMob (Peter gật mẫu 16/11/2026: "xếp theo nhóm thay vì số ra hết").
 * Số mùa (xG, bàn, sút, kiểm soát) lấy thẳng từ data/xg-doi.json; số đếm từ trận (sạch lưới, Over 2.5, cả 2 đội ghi)
 * tính trên danh sách trận giải gần nhất `gan` (tối đa 20 trận). Hàm THUẦN, import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { DoiXg, TranDoi } from "./xg-doi";

export interface SoTran {
  /** Số trận dùng để đếm. */
  n: number;
  sachLuoi: number;
  khongGhi: number;
  /** % trận cả 2 đội cùng ghi bàn. */
  btts: number;
  /** % trận có từ 3 bàn. */
  over25: number;
  /** Trung bình tổng bàn mỗi trận. */
  tbBan: number;
}

const pt = (k: number, n: number) => (n ? Math.round((100 * k) / n) : 0);

export function demTran(gan: readonly TranDoi[]): SoTran {
  const n = gan.length;
  return {
    n,
    sachLuoi: gan.filter((t) => t.bb === 0).length,
    khongGhi: gan.filter((t) => t.bt === 0).length,
    btts: pt(gan.filter((t) => t.bt > 0 && t.bb > 0).length, n),
    over25: pt(gan.filter((t) => t.bt + t.bb > 2).length, n),
    tbBan: n ? gan.reduce((a, t) => a + t.bt + t.bb, 0) / n : 0,
  };
}

export type Nhom = "tong-quan" | "tan-cong" | "phong-ngu" | "ban-thang" | "kiem-soat";

export const NHOM: readonly { id: Nhom; ten: string }[] = [
  { id: "tong-quan", ten: "Tổng quan" },
  { id: "tan-cong", ten: "Tấn công" },
  { id: "phong-ngu", ten: "Phòng ngự" },
  { id: "ban-thang", ten: "Bàn thắng" },
  { id: "kiem-soat", ten: "Kiểm soát" },
];

export interface ChiSo {
  id: string;
  nhom: Nhom;
  ten: string;
  moTa: string;
  /** null = đội thiếu số này, không xếp. */
  gt: (d: DoiXg, s: SoTran) => number | null;
  /** true = nhỏ là tốt (xếp tăng dần). */
  nhoTot?: boolean;
  hien: (x: number, s: SoTran) => string;
  /** Dòng phụ dưới tên đội. */
  phu: (d: DoiXg, s: SoTran) => string;
}

const f2 = (x: number) => x.toFixed(2);
const f1 = (x: number) => x.toFixed(1);
export const dau = (x: number) => `${x > 0.005 ? "+" : x < -0.005 ? "−" : "±"}${Math.abs(x).toFixed(2)}`;
const hang = (d: DoiXg) => (d.hang ? `Hạng ${d.hang} · ${d.diem} điểm` : `${d.tran} trận`);

export const CHI_SO: readonly ChiSo[] = [
  { id: "chenh-xg", nhom: "tong-quan", ten: "Chênh lệch xG", moTa: "xG trừ xGA mỗi trận: đội áp đảo đối thủ nhiều nhất.", gt: (d) => d.chenh, hien: dau, phu: hang },
  { id: "ban-thang", nhom: "tong-quan", ten: "Bàn thắng mỗi trận", moTa: "Bàn ghi thật mỗi trận cả mùa.", gt: (d) => d.bt, hien: f2, phu: (d) => `xG ${f2(d.xg)} mỗi trận` },
  { id: "thung-luoi", nhom: "tong-quan", ten: "Thủng lưới ít nhất", moTa: "Bàn thua thật mỗi trận cả mùa.", gt: (d) => d.bb, nhoTot: true, hien: f2, phu: (d) => `xGA ${f2(d.xga)} mỗi trận` },
  { id: "xg", nhom: "tan-cong", ten: "xG mỗi trận", moTa: "Bàn thắng kỳ vọng: chất lượng cơ hội đội tạo ra.", gt: (d) => d.xg, hien: f2, phu: (d) => `Bàn thật ${f2(d.bt)} mỗi trận` },
  { id: "sut-trung", nhom: "tan-cong", ten: "Sút trúng đích mỗi trận", moTa: "Số cú sút trúng khung thành mỗi trận.", gt: (d) => d.sut, hien: f1, phu: (d) => `${f2(d.bt)} bàn mỗi trận` },
  { id: "vuot-xg", nhom: "tan-cong", ten: "Dứt điểm vượt xG", moTa: "Bàn thật trừ xG mỗi trận. Số dương lớn thường không giữ được lâu.", gt: (d) => d.bt - d.xg, hien: dau, phu: (d) => `${f2(d.bt)} bàn · xG ${f2(d.xg)}` },
  { id: "xga", nhom: "phong-ngu", ten: "xGA thấp nhất", moTa: "Bàn thua kỳ vọng: cơ hội để đối thủ tạo ra mỗi trận.", gt: (d) => d.xga, nhoTot: true, hien: f2, phu: (d) => `Thủng lưới thật ${f2(d.bb)} mỗi trận` },
  { id: "sach-luoi", nhom: "phong-ngu", ten: "Giữ sạch lưới", moTa: "Số trận không thủng lưới.", gt: (_d, s) => s.sachLuoi, hien: (x, s) => `${x}/${s.n}`, phu: (_d, s) => `trong ${s.n} trận gần nhất` },
  { id: "over-25", nhom: "ban-thang", ten: "Trận Over 2.5", moTa: "Tỷ lệ trận có từ 3 bàn trở lên.", gt: (_d, s) => s.over25, hien: (x) => `${x}%`, phu: (_d, s) => `TB ${f1(s.tbBan)} bàn mỗi trận` },
  { id: "btts", nhom: "ban-thang", ten: "Cả 2 đội ghi bàn", moTa: "Tỷ lệ trận hai đội cùng có bàn.", gt: (_d, s) => s.btts, hien: (x) => `${x}%`, phu: (_d, s) => `trong ${s.n} trận gần nhất` },
  { id: "khong-ghi", nhom: "ban-thang", ten: "Tịt ngòi nhiều nhất", moTa: "Số trận không ghi được bàn nào.", gt: (_d, s) => s.khongGhi, hien: (x, s) => `${x}/${s.n}`, phu: (d) => `${f2(d.bt)} bàn mỗi trận` },
  { id: "kiem-soat", nhom: "kiem-soat", ten: "Kiểm soát bóng", moTa: "Tỷ lệ cầm bóng trung bình mỗi trận.", gt: (d) => d.ks, hien: (x) => `${f1(x)}%`, phu: hang },
];

export interface DongChiSo {
  doi: DoiXg;
  gt: number;
  chu: string;
  phu: string;
}

/** Xếp đủ mọi đội có số theo một chỉ số; hòa thì theo tên cho ổn định. */
export function xepChiSo(c: ChiSo, ds: readonly DoiXg[]): DongChiSo[] {
  return ds
    .map((doi) => {
      const s = demTran(doi.gan);
      const gt = c.gt(doi, s);
      return gt == null ? null : { doi, gt, chu: c.hien(gt, s), phu: c.phu(doi, s) };
    })
    .filter((x): x is DongChiSo => x !== null)
    .sort((a, b) => (c.nhoTot ? a.gt - b.gt : b.gt - a.gt) || a.doi.ten.localeCompare(b.doi.ten));
}
