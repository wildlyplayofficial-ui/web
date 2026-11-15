/**
 * Số liệu theo ĐỘI cho /thong-so và /form (Peter giao 15/11/2026, mẫu "Statistics" + "Form" của PredictZ, thêm xG).
 * Tệp data/xg-doi.json do máy ~/.claude/tools/banhbong_predictz/xg_doi.py ghi mỗi lượt nap_repo (nguồn FotMob,
 * chỉ trận giải VĐQG). Hàm ở đây THUẦN, import TƯƠNG ĐỐI để vitest chạy không cần alias.
 * Không số đúng/sai của dự đoán, không tên nhà cái.
 */
import DATA from "../data/xg-doi.json";
import { diemKQ } from "./doi-phong-do";
import type { KQ } from "./phong-do";

export interface TranDoi {
  ngay: string;
  /** Đối thủ. */
  dt: string;
  san: "N" | "K";
  bt: number;
  bb: number;
}

export interface DoiXg {
  id: string;
  ten: string;
  logo: string;
  hang: number | null;
  diem: number | null;
  tran: number;
  th: number | null;
  h: number | null;
  b: number | null;
  /** xG / xGA / chênh — trung bình mỗi trận cả mùa. */
  xg: number;
  xga: number;
  chenh: number;
  /** Bàn ghi / bàn thua mỗi trận cả mùa. */
  bt: number;
  bb: number;
  /** Sút trúng đích mỗi trận. */
  sut: number | null;
  /** Kiểm soát bóng trung bình (%). */
  ks: number | null;
  /** Trận giải gần nhất, CŨ trước MỚI sau. */
  gan: TranDoi[];
}

export interface GiaiXg {
  slug: string;
  ten: string;
  fmId: number;
  tenGoc: string | null;
  doi: DoiXg[];
}

export interface TepXgDoi {
  nguon: string;
  capNhat: string;
  giai: GiaiXg[];
}

const TEP = DATA as unknown as TepXgDoi;

export const tepXgDoi = (): TepXgDoi => TEP;
export const giaiXgTuSlug = (slug: string): GiaiXg | null => TEP.giai.find((g) => g.slug === slug) ?? null;

/** "2026-11-15" -> "15/11/2026". */
export const ngayVi = (ymd: string): string => ymd.split("-").reverse().join("/");

/** Bảng /thong-so: xếp theo chênh xG mỗi trận, hòa thì xG cao hơn. */
export const xepTheoChenh = (ds: readonly DoiXg[]): DoiXg[] =>
  [...ds].sort((a, b) => b.chenh - a.chenh || b.xg - a.xg || a.ten.localeCompare(b.ten));

export const kqTran = (t: TranDoi): KQ => (t.bt > t.bb ? "T" : t.bt === t.bb ? "H" : "B");
/** Điểm (thắng 3, hòa 1) — dùng chung luật với bảng /doi-phong-do-tot-nhat. */
export const diemCua = (ds: readonly TranDoi[]): number => diemKQ(ds.map(kqTran));

/** N trận gần nhất (lọc theo sân nếu có), CŨ trước MỚI sau. */
export function ganNhat(gan: readonly TranDoi[], n = 5, san?: "N" | "K"): TranDoi[] {
  const loc = san ? gan.filter((t) => t.san === san) : gan;
  return loc.slice(-n);
}

/** Số trận liên tiếp (tính từ trận mới nhất ngược về) thỏa `dk`. */
export function chuoi(gan: readonly TranDoi[], dk: (t: TranDoi) => boolean): number {
  let n = 0;
  for (let i = gan.length - 1; i >= 0 && dk(gan[i]); i--) n++;
  return n;
}

export interface DongForm {
  doi: DoiXg;
  giai: GiaiXg;
  kq: KQ[];
  diem: number;
  ghi: number;
  thua: number;
  /** Đủ 5 trận để xếp hạng. */
  du: boolean;
  kqNha: KQ[];
  diemNha: number;
  kqKhach: KQ[];
  diemKhach: number;
  batBai: number;
  ghiLienTiep: number;
}

export function dongForm(doi: DoiXg, giai: GiaiXg): DongForm {
  const g5 = ganNhat(doi.gan);
  const nha = ganNhat(doi.gan, 5, "N");
  const khach = ganNhat(doi.gan, 5, "K");
  return {
    doi,
    giai,
    kq: g5.map(kqTran),
    diem: diemCua(g5),
    ghi: g5.reduce((a, t) => a + t.bt, 0),
    thua: g5.reduce((a, t) => a + t.bb, 0),
    du: g5.length >= 5,
    kqNha: nha.map(kqTran),
    diemNha: diemCua(nha),
    kqKhach: khach.map(kqTran),
    diemKhach: diemCua(khach),
    batBai: chuoi(doi.gan, (t) => t.bt >= t.bb),
    ghiLienTiep: chuoi(doi.gan, (t) => t.bt > 0),
  };
}

/** Bảng form 1 giải: điểm 5 trận gần nhất, hòa thì hiệu số 5 trận, rồi bàn ghi. */
export const xepForm = (ds: readonly DongForm[]): DongForm[] =>
  [...ds].sort((a, b) => b.diem - a.diem || b.ghi - b.thua - (a.ghi - a.thua) || b.ghi - a.ghi || a.doi.ten.localeCompare(b.doi.ten));

export interface BangXep {
  id: string;
  tieuDe: string;
  moTa: string;
  /** Chữ hiện ở cột giá trị. */
  gt: (d: DongForm) => string;
  /** Badge hiện cạnh tên đội. */
  kq: (d: DongForm) => KQ[];
  loc: (d: DongForm) => boolean;
  so: (a: DongForm, b: DongForm) => number;
}

const hs = (d: DongForm) => d.ghi - d.thua;

/** Các bảng xếp kiểu "Form" của PredictZ. */
export const BANG_XEP: readonly BangXep[] = [
  {
    id: "phong-do-tot-nhat", tieuDe: "Phong độ tốt nhất", moTa: "Điểm 5 trận giải gần nhất (thắng 3, hòa 1).",
    gt: (d) => `${d.diem} điểm`, kq: (d) => d.kq, loc: (d) => d.du,
    so: (a, b) => b.diem - a.diem || hs(b) - hs(a) || b.ghi - a.ghi,
  },
  {
    id: "san-nha", tieuDe: "Sân nhà tốt nhất", moTa: "Điểm 5 trận sân nhà gần nhất (cần ít nhất 3 trận).",
    gt: (d) => `${d.diemNha}/${d.kqNha.length * 3}`, kq: (d) => d.kqNha, loc: (d) => d.kqNha.length >= 3,
    so: (a, b) => b.diemNha / b.kqNha.length - a.diemNha / a.kqNha.length || b.diemNha - a.diemNha,
  },
  {
    id: "san-khach", tieuDe: "Sân khách tốt nhất", moTa: "Điểm 5 trận sân khách gần nhất (cần ít nhất 3 trận).",
    gt: (d) => `${d.diemKhach}/${d.kqKhach.length * 3}`, kq: (d) => d.kqKhach, loc: (d) => d.kqKhach.length >= 3,
    so: (a, b) => b.diemKhach / b.kqKhach.length - a.diemKhach / a.kqKhach.length || b.diemKhach - a.diemKhach,
  },
  {
    id: "ghi-ban-nhieu-nhat", tieuDe: "Ghi bàn nhiều nhất", moTa: "Tổng bàn thắng 5 trận giải gần nhất.",
    gt: (d) => `${d.ghi} bàn`, kq: (d) => d.kq, loc: (d) => d.du,
    so: (a, b) => b.ghi - a.ghi || hs(b) - hs(a),
  },
  {
    id: "thung-luoi-it-nhat", tieuDe: "Thủng lưới ít nhất", moTa: "Tổng bàn thua 5 trận giải gần nhất.",
    gt: (d) => `${d.thua} bàn`, kq: (d) => d.kq, loc: (d) => d.du,
    so: (a, b) => a.thua - b.thua || hs(b) - hs(a),
  },
  {
    id: "chuoi-bat-bai", tieuDe: "Chuỗi bất bại dài nhất", moTa: "Số trận giải liên tiếp không thua tính tới trận gần nhất.",
    gt: (d) => `${d.batBai} trận`, kq: (d) => d.kq, loc: (d) => d.batBai > 0,
    so: (a, b) => b.batBai - a.batBai || b.diem - a.diem,
  },
  {
    id: "ghi-ban-lien-tiep", tieuDe: "Ghi bàn liên tiếp", moTa: "Số trận giải liên tiếp có bàn thắng tính tới trận gần nhất.",
    gt: (d) => `${d.ghiLienTiep} trận`, kq: (d) => d.kq, loc: (d) => d.ghiLienTiep > 0,
    so: (a, b) => b.ghiLienTiep - a.ghiLienTiep || b.ghi - a.ghi,
  },
];

/** Top `n` của một bảng xếp, hòa thì xếp theo tên cho ổn định. */
export const topBang = (b: BangXep, ds: readonly DongForm[], n: number): DongForm[] =>
  ds.filter(b.loc).sort((x, y) => b.so(x, y) || x.doi.ten.localeCompare(y.doi.ten)).slice(0, n);

export const dongFormGiai = (g: GiaiXg): DongForm[] => g.doi.map((d) => dongForm(d, g));
