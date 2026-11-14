// Đổi tỷ lệ thập phân (châu Âu) sang phân số hoặc kiểu Mỹ. Chỉ để HIỂN THỊ; dữ liệu gốc luôn là thập phân.
export type DinhDangTyLe = "D" | "F" | "A";

export const KHOA_DINH_DANG = "bb_ty_le";

export const NHAN_DINH_DANG: ReadonlyArray<{ ma: DinhDangTyLe; nhan: string }> = [
  { ma: "D", nhan: "Thập phân" },
  { ma: "F", nhan: "Phân số" },
  { ma: "A", nhan: "Mỹ" },
];

const MAU_SO = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 20, 25, 40, 50];

function ucln(a: number, b: number): number {
  return b === 0 ? a : ucln(b, a % b);
}

/** Phân số gần nhất với d-1 trong các mẫu số thông dụng; sai số không quá 1% (tối thiểu 0.005), không có thì rút gọn (d-1)*100/100. */
export function phanSo(d: number): string {
  const x = d - 1;
  const dung = Math.max(0.005, x * 0.01);
  for (const m of MAU_SO) {
    const t = Math.round(x * m);
    if (Math.abs(t / m - x) <= dung) return `${t}/${m}`;
  }
  const t = Math.round(x * 100);
  const g = ucln(t, 100);
  return `${t / g}/${100 / g}`;
}

export function kieuMy(d: number): string {
  if (d >= 2) return `+${Math.round((d - 1) * 100)}`;
  return `${Math.round(-100 / (d - 1))}`;
}

export function doiTyLe(d: number, dinhDang: DinhDangTyLe): string {
  if (!Number.isFinite(d) || d <= 1) return Number.isFinite(d) ? d.toFixed(2) : "";
  if (dinhDang === "F") return phanSo(d);
  if (dinhDang === "A") return kieuMy(d);
  return d.toFixed(2);
}

export function laDinhDang(v: unknown): v is DinhDangTyLe {
  return v === "D" || v === "F" || v === "A";
}
