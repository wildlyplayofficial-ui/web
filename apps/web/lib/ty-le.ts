// Đổi tỷ lệ thập phân (châu Âu) sang phân số hoặc kiểu Mỹ. Chỉ để HIỂN THỊ; dữ liệu gốc luôn là thập phân.
export type DinhDangTyLe = "D" | "F" | "A";

export const KHOA_DINH_DANG = "bb_ty_le";

export const NHAN_DINH_DANG: ReadonlyArray<{ ma: DinhDangTyLe; nhan: string }> = [
  { ma: "D", nhan: "Thập phân" },
  { ma: "F", nhan: "Phân số" },
  { ma: "A", nhan: "Mỹ" },
];

// Bậc thang phân số của nhà cái Anh (cùng bộ PredictZ hiển thị). Trùng đúng bậc nào thì lấy bậc đó.
const BAC_THANG = [
  "1/10", "1/8", "1/6", "2/11", "1/5", "2/9", "1/4", "2/7", "3/10", "1/3", "4/11", "2/5", "4/9", "1/2", "8/15", "4/7", "8/13", "4/6", "8/11", "4/5", "5/6", "10/11", "1/1",
  "11/10", "6/5", "5/4", "11/8", "6/4", "13/8", "7/4", "15/8", "2/1", "85/40", "9/4", "5/2", "11/4", "3/1", "10/3", "7/2", "4/1", "9/2", "5/1", "11/2", "6/1", "13/2", "7/1", "15/2", "8/1", "9/1", "10/1",
  "11/1", "12/1", "14/1", "16/1", "18/1", "20/1", "22/1", "25/1", "28/1", "33/1", "40/1", "50/1", "66/1", "80/1", "100/1",
].map((t) => {
  const [n, m] = t.split("/").map(Number);
  return { t, d: Math.round((1 + n / m) * 100) };
});

function ucln(a: number, b: number): number {
  return b === 0 ? a : ucln(b, a % b);
}

/** Phân số kiểu nhà cái: đúng bậc thang thì lấy bậc đó; không thì (d-1) rút gọn trên mẫu 10 hoặc 100 (2.70 -> 17/10). */
export function phanSo(d: number): string {
  const cent = Math.round(d * 100);
  const bac = BAC_THANG.find((b) => b.d === cent);
  if (bac) return bac.t;
  const t = cent - 100;
  const m = t % 10 === 0 ? 10 : 100;
  const g = ucln(t / (100 / m), m);
  return `${t / (100 / m) / g}/${m / g}`;
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

/** Đánh dấu một tỷ lệ trong câu chữ để ChuTy bọc lại thành số đổi được kiểu. */
export const T = (x: number) => `\u27E6${x.toFixed(2)}\u27E7`;

export function laDinhDang(v: unknown): v is DinhDangTyLe {
  return v === "D" || v === "F" || v === "A";
}
