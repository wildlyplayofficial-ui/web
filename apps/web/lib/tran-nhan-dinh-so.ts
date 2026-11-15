/**
 * Số liệu cho đoạn nhận định sinh từ tệp tuần (15/11, Peter chốt: trận nào có dự đoán cũng có
 * trang đủ dày để Google lập chỉ mục) + NGƯỠNG dữ liệu để một trang trận tệp tuần được index.
 * Hàm THUẦN, mọi con số tính lại từ danh sách trận. Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import { tenSo } from "./du-doan-cham";
import {
  chuoiHienTai, conMoi, giuSach, kqCuaDoi, moiTruoc, thanhTich,
  type DoiDauMua, type ThanhTich, type TranGanDay,
} from "./tran-so-lieu";
import type { KQ } from "./phong-do";

/** Mỗi đội cần ít nhất chừng này trận gần đây (còn mới ≤30 ngày) thì đoạn phong độ mới có cái để viết. */
export const SO_TRAN_PHONG_DO = 5;
/** Không đủ phong độ thì cần ít nhất chừng này lần đối đầu. */
export const SO_LAN_DOI_DAU = 3;

export interface DuLieuNguong {
  ngay: string;
  nha: string;
  khach: string;
  du: string;
  gn?: TranGanDay[];
  gk?: TranGanDay[];
  h2h?: DoiDauMua[];
}

const soTran = (ds: TranGanDay[] | undefined, doi: string, ngay: string) =>
  (conMoi(ds, ngay) ?? []).filter((t) => kqCuaDoi(t, doi) !== null).length;

/**
 * NGƯỠNG INDEX trang trận tệp tuần: có tỷ số dự đoán VÀ (cả hai đội đủ SO_TRAN_PHONG_DO trận gần
 * đây HOẶC có từ SO_LAN_DOI_DAU lần đối đầu). Dưới ngưỡng = trang mỏng, giữ noindex,follow.
 */
export function duDuLieuIndex(d: DuLieuNguong): boolean {
  if (!/\d+\s*-\s*\d+/.test(d.du)) return false;
  const duPhongDo = soTran(d.gn, d.nha, d.ngay) >= SO_TRAN_PHONG_DO && soTran(d.gk, d.khach, d.ngay) >= SO_TRAN_PHONG_DO;
  return duPhongDo || (d.h2h?.length ?? 0) >= SO_LAN_DOI_DAU;
}

export interface TranMoiNhat { ngay: string; doiThu: string; ghi: number; thung: number; sanNha: boolean; kq: KQ }

/** Số liệu một đội trong các trận gần đây. */
export interface SoDoi extends ThanhTich {
  /** Thành tích riêng ở sân sẽ đá trận này (đội nhà: sân nhà; đội khách: sân khách). */
  san: ThanhTich;
  chuoi: { loai: "chuaThang" | "chuaThua"; so: number } | null;
  /** Số trận giữ sạch lưới / không ghi được bàn / có từ 3 bàn / cả hai đội cùng ghi bàn. */
  sach: number;
  tit: number;
  nhieuBan: number;
  cungGhi: number;
  diem: number;
  moi: TranMoiNhat;
}

/** Số liệu của `doi` (tên gốc trong tệp) từ danh sách trận; chưa đủ SO_TRAN_PHONG_DO trận → null. */
export function soDoi(ds: readonly TranGanDay[] | undefined, doi: string, san: "nha" | "khach"): SoDoi | null {
  const ten = tenSo(doi);
  const cua = moiTruoc(ds ?? []).filter((t) => kqCuaDoi(t, doi) !== null);
  if (cua.length < SO_TRAN_PHONG_DO) return null;
  const tt = thanhTich(cua, doi);
  const ghiThung = (t: TranGanDay): [number, number] => (tenSo(t.nha) === ten ? [t.tsn, t.tsk] : [t.tsk, t.tsn]);
  const m = cua[0];
  const sanNha = tenSo(m.nha) === ten;
  const [ghi, thung] = ghiThung(m);
  return {
    ...tt,
    san: thanhTich(cua, doi, san),
    chuoi: chuoiHienTai(cua, doi),
    sach: giuSach(cua, doi),
    tit: cua.filter((t) => ghiThung(t)[0] === 0).length,
    nhieuBan: cua.filter((t) => t.tsn + t.tsk >= 3).length,
    cungGhi: cua.filter((t) => t.tsn > 0 && t.tsk > 0).length,
    diem: tt.t * 3 + tt.h,
    moi: { ngay: m.ngay, doiThu: sanNha ? m.khach : m.nha, ghi, thung, sanNha, kq: kqCuaDoi(m, doi) ?? "H" },
  };
}

export interface SoDoiDau {
  lan: number;
  /** Đội nhà trận này thắng / hòa / đội khách trận này thắng. */
  nhaThang: number;
  hoa: number;
  khachThang: number;
  /** Trung bình bàn mỗi lần gặp. */
  tbBan: number;
  /** Mọi lần gặp trong danh sách đều đá trên sân đội nhà trận này. */
  cungSan: boolean;
  moi: DoiDauMua;
}

/** Tổng kết các lần gặp nhau (danh sách MỚI NHẤT TRƯỚC); không có → null. */
export function soDoiDau(h2h: readonly DoiDauMua[] | undefined, nha: string): SoDoiDau | null {
  if (!h2h?.length) return null;
  const ten = tenSo(nha);
  const kq = h2h.map((t) => {
    const laNha = tenSo(t.nha) === ten;
    const [a, b] = laNha ? [t.tsn, t.tsk] : [t.tsk, t.tsn];
    return Math.sign(a - b);
  });
  return {
    lan: h2h.length,
    nhaThang: kq.filter((x) => x > 0).length,
    hoa: kq.filter((x) => x === 0).length,
    khachThang: kq.filter((x) => x < 0).length,
    tbBan: h2h.reduce((a, t) => a + t.tsn + t.tsk, 0) / h2h.length,
    cungSan: h2h.every((t) => tenSo(t.nha) === ten),
    moi: h2h[0],
  };
}

/** Xác suất (%) quy từ tỷ lệ 1·X·2 sau khi bỏ phần chênh; tỷ lệ không hợp lệ → null. */
export function xacSuat1X2(mot: readonly number[] | null): [number, number, number] | null {
  if (!mot || mot.length !== 3 || !mot.every((x) => x > 1)) return null;
  const p = mot.map((x) => 1 / x);
  const tong = p[0] + p[1] + p[2];
  const pc = p.map((x) => Math.round((x / tong) * 100));
  return [pc[0], pc[1], pc[2]];
}

/** Chọn một mẫu câu theo khoá (slug + tên đoạn): cùng trận luôn ra cùng câu, trận khác ra câu khác. */
export function chon<T>(ds: readonly T[], khoa: string): T {
  const bam = [...khoa].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return ds[bam % ds.length];
}
