/**
 * Tip theo GIẢI (Peter giao 14/11, học PredictZ "Over 2.5 Premier League"): mỗi giải lớn có ba trang
 * tài xỉu / cả 2 đội ghi bàn / tỷ số cho 7 ngày tới. Chỉ lọc + gom dòng sẵn có của tip-ngay, không tính thêm.
 * Hàm THUẦN, import TƯƠNG ĐỐI để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { GIAI_TRANG, lechNgay, type GiaiTrang } from "./du-doan-loc";
import { dongTipNgay, type DongTip, type KeoPhuTip, type LoaiTip } from "./tip-ngay";

/** Số ngày tính từ hôm nay (gồm hôm nay). */
export const SO_NGAY = 7;

/** Đường dẫn gốc của từng loại: /tai-xiu/{giai}, /ca-2-doi-ghi-ban/{giai}, /ty-so/{giai}. */
export const GOC_TIP_GIAI: Record<LoaiTip, string> = {
  "tai-xiu": "/tai-xiu",
  "hai-doi-ghi-ban": "/ca-2-doi-ghi-ban",
  "ty-so": "/ty-so",
};

export const duongTipGiai = (loai: LoaiTip, g: Pick<GiaiTrang, "slug">) => `${GOC_TIP_GIAI[loai]}/${g.slug}`;

export interface NgayTip {
  ngay: string;
  ds: DongTip[];
}

/** Dòng tip của một giải trong SO_NGAY ngày từ `homNay`, gom theo ngày (ngày không có dòng thì bỏ). */
export function tipGiai(
  hang: readonly HangDuDoan[],
  g: Pick<GiaiTrang, "khop">,
  loai: LoaiTip,
  homNay: string,
  keoPhu: (slug: string) => KeoPhuTip | null | undefined,
): NgayTip[] {
  const cua = hang.filter((h) => g.khop.test(h.giai));
  return Array.from({ length: SO_NGAY }, (_, i) => lechNgay(homNay, i))
    .map((ngay) => ({ ngay, ds: dongTipNgay(cua, ngay, loai, keoPhu) }))
    .filter((x) => x.ds.length > 0);
}

export const demTran = (ngay: readonly NgayTip[]) => ngay.reduce((n, x) => n + x.ds.length, 0);

/** Các (giải, loại) có ít nhất một trận trong 7 ngày: dùng cho sitemap + khối liên kết ở trang giải. */
export function giaiCoTip(
  hang: readonly HangDuDoan[],
  homNay: string,
  keoPhu: (slug: string) => KeoPhuTip | null | undefined,
  loai: readonly LoaiTip[] = ["tai-xiu", "hai-doi-ghi-ban", "ty-so"],
): { giai: GiaiTrang; loai: LoaiTip; soTran: number }[] {
  return GIAI_TRANG.flatMap((giai) =>
    loai.flatMap((l) => {
      const soTran = demTran(tipGiai(hang, giai, l, homNay, keoPhu));
      return soTran > 0 ? [{ giai, loai: l, soTran }] : [];
    }),
  );
}
