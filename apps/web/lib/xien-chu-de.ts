/**
 * Kèo xiên theo chủ đề (Peter duyệt 14/11): xiên Over 2.5, Under 2.5, hai đội cùng ghi bàn, đội nhà thắng,
 * cửa trên an toàn. Mỗi ngày gom từ MỌI giải, chỉ dùng số đã có trên dòng trận (tỷ số dự đoán, tỷ lệ
 * 1X2, Over/Under, hai đội ghi bàn) — không thêm dự đoán mới, không tên nhà cái. Hàm THUẦN.
 */
import type { HangDuDoan } from "./du-doan-hang";
import { gom, type ChanXien, type CuaXien, type Phu, type TraKeoPhu, type Xien } from "./xien";

export type ChuDeXien = "tai" | "xiu" | "btts" | "doi-nha" | "cua-tren";

export interface MoTaChuDe {
  khoa: ChuDeXien;
  /** Đoạn cuối URL: /keo-xien/{slug}. */
  slug: string;
  /** Tên ngắn trên nút chuyển chủ đề. */
  nut: string;
  /** Cụm từ khoá chính ("kèo xiên Over 2.5"). */
  tuKhoa: string;
  /** Giải thích ngắn: chân xiên được chọn thế nào. */
  cachChon: string;
  /** Số chân tối đa mỗi xiên trong chủ đề. */
  toiDa: number;
}

export const CHU_DE: readonly MoTaChuDe[] = [
  { khoa: "tai", slug: "xien-over-2-5", nut: "Over 2.5", tuKhoa: "kèo xiên Over 2.5", toiDa: 4, cachChon: "Chỉ lấy cửa Over (từ 3 bàn trở lên) của những trận có tỷ lệ Over/Under 2.5, ưu tiên các trận tỷ lệ Over thấp nhất." },
  { khoa: "xiu", slug: "xien-under-2-5", nut: "Under 2.5", tuKhoa: "kèo xiên Under 2.5", toiDa: 4, cachChon: "Chỉ lấy cửa Under (tối đa 2 bàn) của những trận có tỷ lệ Over/Under 2.5, ưu tiên các trận tỷ lệ Under thấp nhất." },
  { khoa: "btts", slug: "xien-hai-doi-ghi-ban", nut: "Hai đội ghi bàn", tuKhoa: "kèo xiên hai đội cùng ghi bàn", toiDa: 4, cachChon: "Chỉ lấy cửa cả hai đội cùng ghi bàn của những trận có tỷ lệ này, ưu tiên tỷ lệ thấp nhất." },
  { khoa: "doi-nha", slug: "xien-doi-nha-thang", nut: "Đội nhà thắng", tuKhoa: "kèo xiên đội nhà thắng", toiDa: 4, cachChon: "Chỉ lấy các trận mà tỷ số dự đoán cho chủ nhà thắng, ưu tiên tỷ lệ chủ nhà thấp nhất." },
  { khoa: "cua-tren", slug: "xien-cua-tren-an-toan", nut: "Cửa trên an toàn", tuKhoa: "kèo xiên cửa trên an toàn", toiDa: 3, cachChon: "Chỉ lấy trận mà đội được dự đoán thắng cũng là đội cửa trên của thị trường 1X2 và có tỷ lệ từ 1.10 đến 1.75: ít nhất 2 chân, nhiều nhất 3 chân." },
] as const;

export const chuDeTuSlug = (slug: string): MoTaChuDe | null => CHU_DE.find((c) => c.slug === slug) ?? null;

/** Mức tỷ lệ coi là "an toàn" cho cửa trên. */
export const AN_TOAN: readonly [number, number] = [1.1, 1.75];

/** Giữ `n` chân tỷ lệ thấp nhất (khả năng cao nhất theo thị trường); hòa thì theo giờ đá. */
function top(chan: ChanXien[], n: number): ChanXien[] {
  return chan
    .filter((c) => c.gia > 1)
    .sort((a, b) => a.gia - b.gia || a.h.kickoffUtc.localeCompare(b.h.kickoffUtc) || a.h.slug.localeCompare(b.h.slug))
    .slice(0, n);
}

/** Chân từ thị trường phụ chỉ khi tip (cửa nguồn dự đoán) khớp `re`; `i` = vị trí tỷ lệ của cửa đó trong `keo`. */
function chanTip(h: HangDuDoan, p: Phu | undefined, re: RegExp, i: 0 | 1, cua: CuaXien): ChanXien[] {
  const gia = p && re.test(p.tip) ? p.keo[i] : undefined;
  return typeof gia === "number" ? [{ h, cua, gia }] : [];
}

function chanChuDe(khoa: ChuDeXien, h: HangDuDoan, tra: TraKeoPhu): ChanXien[] {
  if (!h.sapDa) return [];
  const phu = tra(h.slug);
  switch (khoa) {
    case "tai":
      return chanTip(h, phu?.pOu, /over/i, 0, "tai");
    case "xiu":
      return chanTip(h, phu?.pOu, /under/i, 1, "xiu");
    case "btts":
      return chanTip(h, phu?.pBtts, /yes/i, 0, "co");
    case "doi-nha":
      return h.du && h.mot && h.du[0] > h.du[1] ? [{ h, cua: 0, gia: h.mot[0] }] : [];
    case "cua-tren": {
      if (!h.du || !h.mot || h.du[0] === h.du[1]) return [];
      const cua = h.du[0] > h.du[1] ? 0 : 2;
      const gia = h.mot[cua];
      const laCuaTren = gia <= Math.min(...h.mot);
      return laCuaTren && gia >= AN_TOAN[0] && gia <= AN_TOAN[1] ? [{ h, cua, gia }] : [];
    }
  }
}

/**
 * Xiên của một chủ đề trong một nhóm trận (thường là một ngày). Không đủ 2 chân → null.
 * Giữ tối đa `toiDa` chân tỷ lệ thấp nhất rồi xếp theo giờ đá.
 */
export function xienChuDe(khoa: ChuDeXien, rows: readonly HangDuDoan[], tra: TraKeoPhu): Xien | null {
  const toiDa = CHU_DE.find((c) => c.khoa === khoa)?.toiDa ?? 4;
  return gom(top(rows.flatMap((h) => chanChuDe(khoa, h, tra)), toiDa));
}

export interface XienChuDeNgay {
  ngay: string;
  xien: Xien;
}

/** Xiên của chủ đề cho từng ngày trong `ngays` (ngày không đủ chân thì bỏ), giữ thứ tự ngày. */
export function xienChuDeTheoNgay(khoa: ChuDeXien, rows: readonly HangDuDoan[], ngays: readonly string[], tra: TraKeoPhu): XienChuDeNgay[] {
  return ngays.flatMap((ngay) => {
    const xien = xienChuDe(khoa, rows.filter((h) => h.ngay === ngay), tra);
    return xien ? [{ ngay, xien }] : [];
  });
}

/** Tên xiên hiển thị: "Xiên 3 Over 2.5", "Xiên 3 cửa trên an toàn"… */
export function tenXienChuDe(khoa: ChuDeXien, soChan: number): string {
  const ten: Record<ChuDeXien, string> = {
    tai: "Over 2.5",
    xiu: "Under 2.5",
    btts: "hai đội ghi bàn",
    "doi-nha": "đội nhà thắng",
    "cua-tren": "cửa trên an toàn",
  };
  return `Xiên ${soChan} ${ten[khoa]}`;
}
