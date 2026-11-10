/**
 * Khối "hai đội ghi bàn" · "tài xỉu 2,5" · "tỷ số chính xác" trên trang trận (Peter gật qua Jane 10/11).
 * Dữ liệu từ tệp tuần: tip + tỷ lệ + chuỗi 5 trận mỗi đội (h5/a5, CŨ TRƯỚC, mới nhất cuối).
 * Hàm THUẦN, câu chữ tự viết từ số. Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */

/** Một thị trường phụ trong tệp: `keo` = [Có, Không] / [Tài, Xỉu] / [tỷ số]. */
export interface ThiTruongPhu { tip: string; keo: number[]; h5?: string; a5?: string }

/** Chuỗi 5 trận → mảng đạt/không; ký tự ngoài cặp hợp lệ hoặc rỗng → null. */
export function docChuoi(s: string | undefined, dat: "Y" | "O"): boolean[] | null {
  const khong = dat === "Y" ? "N" : "U";
  if (!s || ![...s].every((c) => c === dat || c === khong)) return null;
  return [...s].map((c) => c === dat);
}

export const demChuoi = (s: string | undefined, dat: "Y" | "O") => docChuoi(s, dat)?.filter(Boolean).length ?? 0;

const VE: Record<"btts" | "ou", { dat: "Y" | "O"; noi: string }> = {
  btts: { dat: "Y", noi: "cả hai đội cùng ghi bàn" },
  ou: { dat: "O", noi: "trên 2,5 bàn" },
};

/** "Arsenal có 3/5 trận gần nhất cả hai đội cùng ghi bàn, Chelsea có 3/5."; thiếu cả hai chuỗi → null. */
export function cauChuoi(loai: "btts" | "ou", nha: string, h5: string | undefined, khach: string, a5: string | undefined): string | null {
  const { dat, noi } = VE[loai];
  const ds = [[nha, h5], [khach, a5]].flatMap(([ten, s]) => {
    const c = docChuoi(s, dat);
    return c ? [`${ten} có ${c.filter(Boolean).length}/${c.length}`] : [];
  });
  if (ds.length === 0) return null;
  return ds.length === 2 ? `${ds[0]} trận gần nhất ${noi}, ${ds[1]}.` : `${ds[0]} trận gần nhất ${noi}.`;
}

/** "Tỷ số dự đoán: 2-2 · tỷ lệ 12.00"; tip không có tỷ số → null. */
export function cauTySo(tip: string, keo: readonly number[]): string | null {
  const so = tip.match(/(\d+)\s*-\s*(\d+)/);
  if (!so) return null;
  const tl = keo[0] > 0 ? ` · tỷ lệ ${keo[0].toFixed(2)}` : "";
  return `Tỷ số dự đoán: ${so[1]}-${so[2]}${tl}`;
}
