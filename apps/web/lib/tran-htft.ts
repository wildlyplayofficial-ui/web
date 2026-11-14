/**
 * Khối "Hiệp 1 / Cả trận" và "Điểm tấn công / phòng ngự" trên trang trận (Peter duyệt 14/11).
 * Dữ liệu từ tệp tuần: htft = 9 tỷ lệ khoá "hiệp 1 + cả trận" (H nhà · D hòa · A khách, vd "DH" = hòa hiệp 1,
 * nhà thắng cả trận); diem = [tấn công, phòng ngự] của từng đội, thang 1–10 của nguồn. Thiếu/sai → null, khối không vẽ.
 * Hàm THUẦN, câu chữ tự viết từ số. Import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */

export type KqKy = "H" | "D" | "A";
export type HtFt = Record<string, number>;
/** Thang điểm phong độ của nguồn: 1 (kém) đến 10 (rất tốt). */
export const DIEM_TOI_DA = 10;

export interface DiemDoi {
  n: number[];
  k: number[];
  /** Phong độ chung [đội nhà, đội khách], thang 1–10; chưa có khoá này thì không hiện dòng. */
  c?: number[];
  /** "san": đội nhà tính riêng trận sân nhà, đội khách riêng trận sân khách (giải CLB, 10 trận gần nhất);
   *  "chung": phong độ chung gần đây (trận đội tuyển). Thiếu = chung. */
  loai?: "san" | "chung";
}

const KY: KqKy[] = ["H", "D", "A"];
/** Thứ tự vẽ: hàng = kết quả hiệp 1, cột = kết quả cả trận. */
export const KHOA_HTFT = KY.flatMap((ht) => KY.map((ft) => `${ht}${ft}`));

/** 9 tỷ lệ hợp lệ (số > 1) theo đúng thứ tự KHOA_HTFT; thiếu 1 ô → null. */
export function docHtft(h: HtFt | undefined): number[] | null {
  if (!h) return null;
  const ds = KHOA_HTFT.map((k) => h[k]);
  return ds.every((x) => typeof x === "number" && Number.isFinite(x) && x > 1) ? ds : null;
}

/** Cặp [tấn công, phòng ngự] hợp lệ (số nguyên 1–10); sai → null. */
export function docDiem(d: number[] | undefined): [number, number] | null {
  return d?.length === 2 && d.every((x) => Number.isInteger(x) && x >= 1 && x <= DIEM_TOI_DA) ? [d[0], d[1]] : null;
}

/** Khoá ô có tỷ lệ thấp nhất (khả năng cao nhất); hòa tỷ lệ → ô đứng trước. */
export function cuaNoiNhat(h: HtFt): string | null {
  const ds = docHtft(h);
  if (!ds) return null;
  return KHOA_HTFT[ds.indexOf(Math.min(...ds))];
}

/** "Hòa hiệp 1, Uganda thắng cả trận" từ khoá "DH". */
export function nhanCua(khoa: string, nha: string, khach: string): string {
  const [ht, ft] = khoa as unknown as [KqKy, KqKy];
  const ten = { H: nha, A: khach } as const;
  if (ht === ft && ht !== "D") return `${ten[ht]} dẫn hiệp 1 và thắng cả trận`;
  const a = ht === "D" ? "Hòa hiệp 1" : `${ten[ht]} dẫn hiệp 1`;
  const b = ft === "D" ? "hòa cả trận" : `${ten[ft]} thắng cả trận`;
  return `${a}, ${b}`;
}

/** Tỷ lệ ước tính (%) hiệp 1 / cả trận theo 1/tỷ lệ chuẩn hoá (bỏ biên nhà cái); nguồn 9 ô hợp lệ. */
export function xacSuatTheoHang(h: HtFt): { hiep1: number[]; catran: number[] } | null {
  const ds = docHtft(h);
  if (!ds) return null;
  const p = ds.map((x) => 1 / x);
  const tong = p.reduce((a, b) => a + b, 0);
  const pc = (f: (i: number) => boolean) => Math.round((p.filter((_, i) => f(i)).reduce((a, b) => a + b, 0) / tong) * 100);
  return {
    hiep1: [0, 1, 2].map((r) => pc((i) => Math.floor(i / 3) === r)),
    catran: [0, 1, 2].map((c) => pc((i) => i % 3 === c)),
  };
}

/** Câu tổng kết: cửa tỷ lệ thấp nhất + tỷ lệ của nó. Thiếu dữ liệu → null. */
export function cauHtft(h: HtFt | undefined, nha: string, khach: string): string | null {
  const ds = h && docHtft(h);
  const k = h && cuaNoiNhat(h);
  if (!ds || !k) return null;
  return `Cửa có tỷ lệ thấp nhất: ${nhanCua(k, nha, khach)} (${ds[KHOA_HTFT.indexOf(k)].toFixed(2)}).`;
}

/** "Uganda tấn công 5/5, phòng ngự 4/5." */
export function cauDiem(ten: string, d: number[] | undefined): string | null {
  const x = docDiem(d);
  return x ? `${ten} tấn công ${x[0]}/${DIEM_TOI_DA}, phòng ngự ${x[1]}/${DIEM_TOI_DA}.` : null;
}

/** Điểm phong độ chung của một đội (0 = nhà, 1 = khách); thiếu hoặc sai thang → null. */
export function docDiemChung(c: number[] | undefined, i: 0 | 1): number | null {
  const x = c?.length === 2 ? c[i] : undefined;
  return x !== undefined && Number.isInteger(x) && x >= 1 && x <= DIEM_TOI_DA ? x : null;
}
