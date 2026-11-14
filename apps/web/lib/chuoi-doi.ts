/**
 * "Chuỗi đáng chú ý" (Peter gật 14/11): đội đang có chuỗi thắng / không thua / không thắng / thua,
 * chuỗi Over, Under, hai đội ghi bàn, giữ sạch lưới — tính từ danh sách 10 trận gần nhất trong tệp tuần.
 * Chuỗi tính từ trận MỚI NHẤT lùi về trước, dừng ở trận đầu tiên không đạt. Hàm THUẦN, import TƯƠNG ĐỐI.
 */
import { tenSo } from "./du-doan-cham";
import { kqCuaDoi, moiTruoc, type TranGanDay } from "./tran-so-lieu";

export type LoaiChuoi = "thang" | "khongThua" | "khongThang" | "thua" | "tai" | "xiu" | "haiDoiGhi" | "giuSach";

/** Ngưỡng tối thiểu để một chuỗi được gọi là "đáng chú ý" (danh sách chỉ có 10 trận). */
export const NGUONG: Record<LoaiChuoi, number> = {
  thang: 4,
  khongThua: 6,
  khongThang: 6,
  thua: 4,
  tai: 5,
  xiu: 5,
  haiDoiGhi: 5,
  giuSach: 3,
};

type Dat = (t: TranGanDay, doi: string) => boolean;
const ghiThung = (t: TranGanDay, doi: string): [number, number] => (tenSo(t.nha) === tenSo(doi) ? [t.tsn, t.tsk] : [t.tsk, t.tsn]);

const DIEU_KIEN: Record<LoaiChuoi, Dat> = {
  thang: (t, d) => kqCuaDoi(t, d) === "T",
  khongThua: (t, d) => kqCuaDoi(t, d) !== "B",
  khongThang: (t, d) => kqCuaDoi(t, d) !== "T",
  thua: (t, d) => kqCuaDoi(t, d) === "B",
  tai: (t) => t.tsn + t.tsk > 2.5,
  xiu: (t) => t.tsn + t.tsk < 2.5,
  haiDoiGhi: (t) => t.tsn > 0 && t.tsk > 0,
  giuSach: (t, d) => ghiThung(t, d)[1] === 0,
};

/** Số trận liền kề (từ mới nhất) thoả điều kiện; trận không có `doi` bị bỏ qua. */
export function demChuoiLoai(ds: readonly TranGanDay[], doi: string, loai: LoaiChuoi): number {
  const trans = moiTruoc(ds).filter((t) => kqCuaDoi(t, doi) !== null);
  const dut = trans.findIndex((t) => !DIEU_KIEN[loai](t, doi));
  return dut === -1 ? trans.length : dut;
}

export interface ChuoiDoi {
  loai: LoaiChuoi;
  so: number;
  /** Số trận có trong danh sách (mẫu số), tối đa 10. */
  tren: number;
}

/** Mọi chuỗi đạt ngưỡng của một đội. Chuỗi "không thua" bỏ khi chính là chuỗi thắng (trùng ý); tương tự "không thắng" vs "thua". */
export function chuoiCuaDoi(ds: readonly TranGanDay[] | undefined, doi: string): ChuoiDoi[] {
  if (!ds?.length) return [];
  const tren = ds.filter((t) => kqCuaDoi(t, doi) !== null).length;
  const ra = (Object.keys(NGUONG) as LoaiChuoi[])
    .map((loai) => ({ loai, so: demChuoiLoai(ds, doi, loai), tren }))
    .filter((c) => c.so >= NGUONG[c.loai]);
  const co = (l: LoaiChuoi) => ra.find((c) => c.loai === l);
  return ra.filter((c) => !(c.loai === "khongThua" && co("thang") && co("thang")!.so === c.so) && !(c.loai === "khongThang" && co("thua") && co("thua")!.so === c.so));
}

/** Một trận sắp tới của đội, đủ để dựng dòng chuỗi. */
export interface DongChoChuoi {
  ngay: string;
  nha: string;
  khach: string;
  gn?: TranGanDay[];
  gk?: TranGanDay[];
}

export interface MucChuoi extends ChuoiDoi {
  doi: string;
  doiThu: string;
  laNha: boolean;
  /** Trận sắp tới đầu tiên của đội (ngày ≥ hôm nay). */
  tran: DongChoChuoi;
  /** Danh sách trận (mới nhất trước) để vẽ dải kết quả. */
  gan: TranGanDay[];
}

/**
 * Chuỗi của từng đội trong các trận từ `homNay` trở đi: mỗi đội lấy trận sắp tới sớm nhất,
 * danh sách `ds` lọc bằng `loc` (vd bỏ danh sách cũ quá 30 ngày). Xếp: chuỗi dài nhất trước, rồi tên.
 */
export function mucChuoi(
  dong: readonly DongChoChuoi[],
  homNay: string,
  loc: (ds: TranGanDay[] | undefined, ngayDa: string) => TranGanDay[] | undefined = (ds) => ds,
): MucChuoi[] {
  const sapDa = dong.filter((d) => d.ngay >= homNay).sort((a, b) => a.ngay.localeCompare(b.ngay));
  const daThay = new Set<string>();
  const ra: MucChuoi[] = [];
  for (const d of sapDa) {
    for (const [doi, doiThu, laNha, ds] of [
      [d.nha, d.khach, true, d.gn],
      [d.khach, d.nha, false, d.gk],
    ] as const) {
      const khoa = tenSo(doi);
      if (daThay.has(khoa)) continue;
      daThay.add(khoa);
      const gan = loc(ds, d.ngay);
      for (const c of chuoiCuaDoi(gan, doi)) ra.push({ ...c, doi, doiThu, laNha, tran: d, gan: moiTruoc(gan ?? []) });
    }
  }
  return ra.sort((a, b) => b.so - a.so || a.doi.localeCompare(b.doi));
}
