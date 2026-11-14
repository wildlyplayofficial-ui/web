/**
 * Bảng "đội phong độ tốt nhất" (kiểu "best form teams" của PredictZ): xếp các đội có trận trong 7 ngày tới theo
 * điểm phong độ chung (diem.c, thang 1–10) rồi theo điểm 5 trận gần nhất (thắng 3, hòa 1). Hàm THUẦN,
 * import TƯƠNG ĐỐI để vitest chạy không cần alias. Không số đúng/sai của dự đoán, không tên nhà cái.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { conMoi, kqCuaDoi, moiTruoc, type TranGanDay } from "./tran-so-lieu";
import type { KQ } from "./phong-do";

export interface TuLieuDoi { c?: number[]; gn?: TranGanDay[]; gk?: TranGanDay[]; ngay: string }

export interface DongPhongDo {
  doi: string;
  logo: string;
  giai: string;
  diem: number;
  /** 5 trận gần nhất, TRÁI = cũ nhất, PHẢI = mới nhất. */
  kq: KQ[];
  /** Trận kế tiếp của đội trong cửa sổ ngày. */
  tran: { slug: string; ngay: string; gio: string; doiThu: string; san: "nha" | "khach" };
}

const diemKQ = (kq: readonly KQ[]) => kq.reduce((a, k) => a + (k === "T" ? 3 : k === "H" ? 1 : 0), 0);

/** `hang` đã xếp theo giờ đá; đội lấy trận ĐẦU TIÊN trong [tu, den] có đủ điểm chung, 5 trận gần nhất và logo thật. */
export function xepDoiPhongDo(
  hang: readonly HangDuDoan[],
  tu: string,
  den: string,
  tra: (slug: string) => TuLieuDoi | null | undefined,
): DongPhongDo[] {
  const thay = new Set<string>();
  const ra: DongPhongDo[] = [];
  const trongNgay = hang.filter((h) => h.ngay >= tu && h.ngay <= den).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  for (const h of trongNgay) {
    const t = tra(h.slug);
    if (!t) continue;
    for (const san of ["nha", "khach"] as const) {
      const doi = san === "nha" ? h.nha : h.khach;
      const logo = san === "nha" ? h.logoNha : h.logoKhach;
      const diem = t.c?.length === 2 ? t.c[san === "nha" ? 0 : 1] : undefined;
      const ds = conMoi(san === "nha" ? t.gn : t.gk, t.ngay);
      if (!logo || diem === undefined || !Number.isInteger(diem) || diem < 1 || diem > 10 || !ds || thay.has(doi)) continue;
      const kq = moiTruoc(ds).flatMap((x) => { const k = kqCuaDoi(x, doi); return k ? [k] : []; }).slice(0, 5);
      if (kq.length < 5) continue;
      thay.add(doi);
      ra.push({ doi, logo, giai: h.giai, diem, kq: kq.reverse(), tran: { slug: h.slug, ngay: h.ngay, gio: h.gio, doiThu: san === "nha" ? h.khach : h.nha, san } });
    }
  }
  return ra.sort((a, b) => b.diem - a.diem || diemKQ(b.kq) - diemKQ(a.kq) || a.doi.localeCompare(b.doi));
}
