/**
 * Kèo xiên dựng từ bảng dự đoán (Peter 12/11: "làm theo PredictZ"): mỗi giải trong ngày gom thành
 * xiên đội thắng, xiên tài xỉu 2,5 và xiên hai đội ghi bàn — mỗi trận một chân, nhân tỷ lệ thành
 * tỷ lệ gộp. Chỉ dùng số đã có trên dòng trận — không thêm dự đoán mới, không tên nhà cái.
 * Hàm THUẦN, import tương đối để vitest chạy không cần alias.
 */
import type { HangDuDoan } from "./du-doan-hang";

export type CuaXien = 0 | 2 | "tai" | "xiu" | "co" | "khong";
export type LoaiXien = "thang" | "tai-xiu" | "btts";

export interface ChanXien {
  h: HangDuDoan;
  /** 0 = chủ nhà thắng, 2 = khách thắng (trùng ô 1·X·2); "tai"/"xiu" = mốc 2,5 bàn; "co"/"khong" = hai đội cùng ghi bàn. */
  cua: CuaXien;
  gia: number;
}

export interface Xien {
  chan: ChanXien[];
  /** Tỷ lệ gộp = tích tỷ lệ các chân. */
  tong: number;
}

/** Một thị trường phụ của trận: `tip` kiểu "Over 2.5" / "BTTS Yes", `keo` = [cửa thuận, cửa nghịch]. */
interface Phu { tip: string; keo: number[] }
export type TraKeoPhu = (slug: string) => { pOu?: Phu; pBtts?: Phu } | null | undefined;

const IT_NHAT = 2;
const TOI_DA = 8;

function gom(chan: ChanXien[]): Xien | null {
  const chon = chan
    .filter((c) => c.gia > 1)
    .sort((a, b) => a.h.kickoffUtc.localeCompare(b.h.kickoffUtc) || a.h.slug.localeCompare(b.h.slug))
    .slice(0, TOI_DA);
  if (chon.length < IT_NHAT) return null;
  return { chan: chon, tong: chon.reduce((t, c) => t * c.gia, 1) };
}

/** Chân từ thị trường phụ: tip khớp `thuan` lấy tỷ lệ đầu, khớp `nghich` lấy tỷ lệ sau. */
function chanPhu(h: HangDuDoan, p: Phu | undefined, thuan: RegExp, nghich: RegExp, cua: [CuaXien, CuaXien]): ChanXien[] {
  if (!p) return [];
  const i = thuan.test(p.tip) ? 0 : nghich.test(p.tip) ? 1 : null;
  const gia = i === null ? undefined : p.keo[i];
  return i !== null && typeof gia === "number" ? [{ h, cua: cua[i], gia }] : [];
}

/** Xiên đội thắng: đội mà tỷ số dự đoán cho thắng. Trận dự đoán hòa thì bỏ. */
export function xienDoiThang(rows: readonly HangDuDoan[]): Xien | null {
  return gom(
    rows.flatMap((h): ChanXien[] => {
      if (!h.sapDa || !h.du || !h.mot || h.du[0] === h.du[1]) return [];
      const cua = h.du[0] > h.du[1] ? 0 : 2;
      return [{ h, cua, gia: h.mot[cua] }];
    }),
  );
}

/** Xiên tài/xỉu 2,5 bàn. Trận tệp không ghi tài xỉu thì bỏ. */
export function xienTaiXiu(rows: readonly HangDuDoan[], tra: TraKeoPhu): Xien | null {
  return gom(rows.flatMap((h) => (h.sapDa ? chanPhu(h, tra(h.slug)?.pOu, /over/i, /under/i, ["tai", "xiu"]) : [])));
}

/** Xiên hai đội cùng ghi bàn (có / không). */
export function xienHaiDoiGhi(rows: readonly HangDuDoan[], tra: TraKeoPhu): Xien | null {
  return gom(rows.flatMap((h) => (h.sapDa ? chanPhu(h, tra(h.slug)?.pBtts, /yes/i, /no/i, ["co", "khong"]) : [])));
}

export interface XienNgay {
  /** id khối, kiểu "nations-league-thang". */
  khoa: string;
  giai: string;
  loai: LoaiXien;
  xien: Xien;
}

const khoaGiai = (ten: string) =>
  ten.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Các xiên của một ngày, gom theo giải: giải nhiều trận đứng trước, mỗi giải lần lượt đội thắng,
 * tài xỉu, hai đội ghi bàn. Giải chỉ có 1 trận thì không có xiên. Không gom nổi → mảng rỗng.
 */
export function cacXienNgay(rows: readonly HangDuDoan[], tra: TraKeoPhu): XienNgay[] {
  const theoGiai = new Map<string, HangDuDoan[]>();
  for (const h of rows) theoGiai.set(h.giai, [...(theoGiai.get(h.giai) ?? []), h]);
  return [...theoGiai]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .flatMap(([giai, ds]) =>
      ([["thang", xienDoiThang(ds)], ["tai-xiu", xienTaiXiu(ds, tra)], ["btts", xienHaiDoiGhi(ds, tra)]] as const).flatMap(([loai, xien]) =>
        xien ? [{ khoa: `${khoaGiai(giai)}-${loai}`, giai, loai, xien }] : [],
      ),
    );
}

/** Tên loại xiên; xiên tài xỉu mà mọi chân cùng một cửa thì gọi thẳng cửa đó ("Xiên 5 xỉu 2.5"). */
export function tenLoaiXien(loai: LoaiXien, chan: readonly { cua: CuaXien }[]): string {
  const n = chan.length;
  if (loai === "thang") return `Xiên ${n} đội thắng`;
  if (loai === "btts") return `Xiên ${n} hai đội ghi bàn`;
  const cua = chan.every((c) => c.cua === "xiu") ? "xỉu" : chan.every((c) => c.cua === "tai") ? "tài" : "tài xỉu";
  return `Xiên ${n} ${cua} 2.5`;
}
