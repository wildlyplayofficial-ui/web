import { T } from "./ty-le";
/**
 * Ba bảng tỷ lệ phụ của trang trận tuần: Hòa hoàn tiền (pDnb), Kết quả + cả hai đội ghi bàn (pKqBtts),
 * Kết quả + Over/Under 2.5 (pKqOu). Thiếu hoặc sai số (không phải số > 1) → null, hộp không vẽ.
 */
export type KqBtts = { nY: number; nN: number; kY: number; kN: number; hY: number; hN: number };
export type KqOu = { nT: number; nX: number; kT: number; kX: number; hT: number; hX: number };

const ok = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 1;

export const docDnb = (d: readonly number[] | undefined): [number, number] | null => (d?.length === 2 && d.every(ok) ? [d[0], d[1]] : null);

function docLuoi<T extends string>(o: Partial<Record<T, number>> | undefined, khoa: readonly T[]): Record<T, number> | null {
  if (!o || !khoa.every((k) => ok(o[k]))) return null;
  return Object.fromEntries(khoa.map((k) => [k, o[k] as number])) as Record<T, number>;
}
export const KHOA_BTTS = ["nY", "nN", "hY", "hN", "kY", "kN"] as const; // nhà · hòa · khách, mỗi hàng Có / Không
export const KHOA_OU = ["nT", "nX", "hT", "hX", "kT", "kX"] as const; // nhà · hòa · khách, mỗi hàng Over/Under
export const docKqBtts = (o: KqBtts | undefined) => docLuoi(o, KHOA_BTTS);
export const docKqOu = (o: KqOu | undefined) => docLuoi(o, KHOA_OU);

/** Khoá ô có tỷ lệ thấp nhất; bằng nhau → ô đứng trước. */
export function oThapNhat(g: Record<string, number>): string | null {
  const e = Object.entries(g);
  return e.length ? e.reduce((a, b) => (b[1] < a[1] ? b : a))[0] : null;
}

const doi = (c: string, nha: string, khach: string) => (c === "n" ? `${nha} thắng` : c === "k" ? `${khach} thắng` : "hai đội hòa");

export function cauDnb(d: [number, number], nha: string, khach: string): string {
  const nhaTruoc = d[0] <= d[1];
  return `Nếu trận kết thúc hòa, tiền cược được trả lại. Cửa có tỷ lệ thấp nhất: ${nhaTruoc ? nha : khach} thắng (${T(nhaTruoc ? d[0] : d[1])}).`;
}

export function cauKqBtts(g: KqBtts, nha: string, khach: string): string {
  const k = oThapNhat(g) as keyof KqBtts;
  return `Đoán kết quả và việc cả hai đội cùng ghi bàn. Cửa có tỷ lệ thấp nhất: ${doi(k[0], nha, khach)}, ${k[1] === "Y" ? "cả hai đội cùng ghi bàn" : "không phải cả hai đội cùng ghi bàn"} (${T(g[k])}).`;
}

export function cauKqOu(g: KqOu, nha: string, khach: string): string {
  const k = oThapNhat(g) as keyof KqOu;
  return `Đoán kết quả và tổng số bàn so với 2.5. Cửa có tỷ lệ thấp nhất: ${doi(k[0], nha, khach)}, ${k[1] === "T" ? "Over (từ 3 bàn trở lên)" : "Under (tối đa 2 bàn)"} (${T(g[k])}).`;
}
