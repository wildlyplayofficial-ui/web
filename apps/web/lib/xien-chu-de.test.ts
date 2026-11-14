import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { chuDeTuSlug, CHU_DE, tenXienChuDe, xienChuDe, xienChuDeTheoNgay } from "./xien-chu-de";

const tran = (slug: string, du: [number, number] | null, mot: [number, number, number] | null, o: Partial<HangDuDoan> = {}) =>
  ({ slug, du, mot, sapDa: true, giai: "G", ngay: "2026-11-15", kickoffUtc: "2026-11-15T12:00:00Z", ...o }) as HangDuDoan;

const keo: Record<string, { pOu?: { tip: string; keo: number[] }; pBtts?: { tip: string; keo: number[] } }> = {
  a: { pOu: { tip: "Over 2.5", keo: [1.8, 2.0] }, pBtts: { tip: "BTTS Yes", keo: [1.7, 2.1] } },
  b: { pOu: { tip: "Under 2.5", keo: [2.3, 1.6] }, pBtts: { tip: "BTTS No", keo: [2.2, 1.6] } },
  c: { pOu: { tip: "Over 2.5", keo: [1.5, 2.5] } },
  d: { pOu: { tip: "Over 2.5", keo: [1.9, 1.9] }, pBtts: { tip: "BTTS Yes", keo: [1.9, 1.9] } },
};
const tra = (s: string) => keo[s];
const ds = ["a", "b", "c", "d"].map((s) => tran(s, [2, 1], [1.5, 3.5, 5]));

describe("xienChuDe", () => {
  it("Over 2.5: chỉ cửa Over, xếp theo giờ đá; Under bị loại", () => {
    const x = xienChuDe("tai", ds, tra);
    expect(x?.chan.map((c) => `${c.h.slug}:${c.cua}:${c.gia}`).sort()).toEqual(["a:tai:1.8", "c:tai:1.5", "d:tai:1.9"]);
    expect(x?.tong).toBeCloseTo(1.8 * 1.5 * 1.9);
  });
  it("Under 2.5: chỉ cửa Under, lấy tỷ lệ Under; 1 chân thì không dựng", () => {
    expect(xienChuDe("xiu", ds, tra)).toBeNull();
    const x = xienChuDe("xiu", [...ds, tran("b2", [0, 0], null)], (s) => (s === "b2" ? keo.b : keo[s]));
    expect(x?.chan.map((c) => `${c.cua}:${c.gia}`)).toEqual(["xiu:1.6", "xiu:1.6"]);
  });
  it("hai đội ghi bàn: chỉ BTTS Yes", () => {
    expect(xienChuDe("btts", ds, tra)?.chan.map((c) => c.h.slug).sort()).toEqual(["a", "d"]);
  });
  it("giữ tối đa 4 chân tỷ lệ thấp nhất", () => {
    const nhieu = Array.from({ length: 7 }, (_, i) => tran(`n${i}`, [1, 0], [1.2 + i * 0.1, 3, 4]));
    const x = xienChuDe("doi-nha", nhieu, tra);
    expect(x?.chan).toHaveLength(4);
    expect(Math.max(...x!.chan.map((c) => c.gia))).toBeCloseTo(1.5);
  });
  it("đội nhà thắng: bỏ khách thắng, hòa, trận đã đá, thiếu tỷ lệ", () => {
    const rows = [tran("h1", [2, 0], [1.4, 3, 6]), tran("h2", [1, 0], [2.1, 3, 3]), tran("k", [0, 2], [5, 3, 1.5]), tran("x", [1, 1], [2, 3, 3]), tran("d", [3, 0], [1.2, 5, 9], { sapDa: false }), tran("m", [2, 0], null)];
    expect(xienChuDe("doi-nha", rows, tra)?.chan.map((c) => c.h.slug)).toEqual(["h1", "h2"]);
  });
  it("cửa trên an toàn: phải là cửa trên của 1X2 và trong 1.10–1.75, tối đa 3 chân", () => {
    const rows = [
      tran("s1", [2, 0], [1.3, 4, 8]),
      tran("s2", [0, 1], [6, 4, 1.5]),
      tran("s3", [1, 0], [1.7, 3.5, 4.5]),
      tran("quaThap", [3, 0], [1.05, 9, 20]),
      tran("quaCao", [1, 0], [1.9, 3.4, 4]),
      tran("khongPhaiCuaTren", [1, 0], [2.4, 3.2, 2.2]),
      tran("s4", [2, 0], [1.6, 3.5, 5]),
    ];
    const x = xienChuDe("cua-tren", rows, tra);
    expect(x?.chan.map((c) => c.h.slug).sort()).toEqual(["s1", "s2", "s4"]);
    expect(x?.chan.find((c) => c.h.slug === "s2")?.cua).toBe(2);
  });
});

describe("xienChuDeTheoNgay", () => {
  it("gom riêng từng ngày, ngày không đủ 2 chân thì bỏ", () => {
    const rows = [
      tran("a", [1, 0], [1.4, 3, 5], { ngay: "2026-11-15" }),
      tran("b", [1, 0], [1.5, 3, 5], { ngay: "2026-11-15" }),
      tran("c", [1, 0], [1.5, 3, 5], { ngay: "2026-11-16" }),
    ];
    const kq = xienChuDeTheoNgay("doi-nha", rows, ["2026-11-15", "2026-11-16", "2026-11-17"], tra);
    expect(kq.map((k) => k.ngay)).toEqual(["2026-11-15"]);
  });
});

describe("danh mục chủ đề", () => {
  it("slug duy nhất, tra ngược được, tên xiên đúng", () => {
    expect(new Set(CHU_DE.map((c) => c.slug)).size).toBe(CHU_DE.length);
    expect(chuDeTuSlug("xien-over-2-5")?.khoa).toBe("tai");
    expect(chuDeTuSlug("thu-bay")).toBeNull();
    expect(tenXienChuDe("cua-tren", 3)).toBe("Xiên 3 cửa trên an toàn");
  });
});
