/**
 * Bảng thành tích dự đoán ngày (Peter 11/11/2026, plan traffic phần 2): dự đoán PredictZ đã đá, chấm với
 * tỷ số thật. Sổ lưu ở data/thanh-tich.json (máy nạp tệp ghi thêm, KHÔNG xoá) vì tệp tuần chỉ giữ 7 ngày.
 * Hàm thuần — trang tự nạp dữ liệu.
 */
import { chieuDuDoan } from "./phong-do";

export interface DongCham {
  ngay: string;
  giai: string;
  nha: string;
  khach: string;
  /** "Home 2-1" / "Draw 1-1" / "Away 0-2". */
  du: string;
  /** "Tài 2.5" / "Xỉu 2.5". */
  tx?: string;
  /** "Có" / "Không". */
  btts?: string;
  /** Tỷ số thật [nhà, khách]. */
  kq?: number[];
}

export interface TranCham extends DongCham {
  duSo: [number, number];
  that: [number, number];
  dung: boolean;
  dungTySo: boolean;
  /** null = trận không có dự đoán tài xỉu / hai đội ghi bàn. */
  dungTx: boolean | null;
  dungBtts: boolean | null;
}

export interface Dem {
  tran: number;
  dung: number;
}

export interface TongThanhTich {
  ketQua: Dem;
  tySo: Dem;
  taiXiu: Dem;
  haiDoiGhi: Dem;
  tuNgay: string | null;
  denNgay: string | null;
}

const khoa = (d: DongCham) => `${d.ngay}|${d.nha}|${d.khach}`;

/** Gộp sổ cũ + tệp tuần hiện tại (dòng sau đè dòng trước cùng trận), chỉ giữ dòng đã có kết quả. */
export function gopSo(...nguon: readonly (readonly DongCham[])[]): DongCham[] {
  const m = new Map<string, DongCham>();
  for (const ds of nguon) for (const d of ds) if (d.kq?.length === 2) m.set(khoa(d), d);
  return [...m.values()];
}

/** Chấm một dòng; dự đoán không đọc được tỷ số → null (không tính). */
export function chamDong(d: DongCham): TranCham | null {
  const so = d.du.match(/(\d+)\s*-\s*(\d+)/);
  if (!so || d.kq?.length !== 2) return null;
  const duSo: [number, number] = [Number(so[1]), Number(so[2])];
  const that: [number, number] = [d.kq[0], d.kq[1]];
  const ban = that[0] + that[1];
  return {
    ...d,
    duSo,
    that,
    dung: chieuDuDoan(duSo) === chieuDuDoan(that),
    dungTySo: duSo[0] === that[0] && duSo[1] === that[1],
    dungTx: d.tx ? /tài/i.test(d.tx) === ban > 2.5 : null,
    dungBtts: d.btts ? (d.btts === "Có") === (that[0] > 0 && that[1] > 0) : null,
  };
}

const dem = (ds: readonly (boolean | null)[]): Dem => {
  const co = ds.filter((x): x is boolean => x !== null);
  return { tran: co.length, dung: co.filter(Boolean).length };
};

export function tongThanhTich(ds: readonly TranCham[]): TongThanhTich {
  const ngay = ds.map((d) => d.ngay).sort();
  return {
    ketQua: dem(ds.map((d) => d.dung)),
    tySo: dem(ds.map((d) => d.dungTySo)),
    taiXiu: dem(ds.map((d) => d.dungTx)),
    haiDoiGhi: dem(ds.map((d) => d.dungBtts)),
    tuNgay: ngay[0] ?? null,
    denNgay: ngay[ngay.length - 1] ?? null,
  };
}

/** Nhóm theo ngày, ngày mới nhất trước. */
export function theoNgay(ds: readonly TranCham[]): [string, TranCham[]][] {
  const m = new Map<string, TranCham[]>();
  for (const d of ds) m.set(d.ngay, [...(m.get(d.ngay) ?? []), d]);
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export const phanTram = (x: Dem) => (x.tran > 0 ? `${Math.round((x.dung / x.tran) * 100)}%` : "–");
