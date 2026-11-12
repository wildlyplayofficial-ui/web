import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { cacXienNgay, xienDoiThang, xienHaiDoiGhi, xienTaiXiu } from "./xien";

const tran = (slug: string, du: [number, number] | null, mot: [number, number, number] | null, sapDa = true, giai = "Giao hữu", kickoffUtc = "2026-11-12T19:45:00Z") =>
  ({ slug, du, mot, sapDa, giai, kickoffUtc }) as HangDuDoan;

describe("xienDoiThang", () => {
  it("lấy đội được dự đoán thắng, xếp theo giờ đá", () => {
    const kq = xienDoiThang([
      tran("a", [2, 0], [1.8, 3.5, 4], true, "G", "2026-11-12T20:00:00Z"),
      tran("b", [0, 1], [5, 3.6, 1.5], true, "G", "2026-11-12T17:00:00Z"),
    ]);
    expect(kq?.chan.map((c) => `${c.h.slug}:${c.cua}:${c.gia}`)).toEqual(["b:2:1.5", "a:0:1.8"]);
  });
  it("tỷ lệ gộp là tích các chân", () => {
    expect(xienDoiThang([tran("a", [2, 0], [2, 3, 4]), tran("b", [2, 0], [1.5, 3, 4]), tran("c", [2, 0], [1.25, 3, 4])])?.tong).toBeCloseTo(3.75);
  });
  it("bỏ trận đã đá, thiếu tỷ lệ, thiếu tỷ số dự đoán, dự đoán hòa", () => {
    const tot = [tran("a", [2, 0], [1.5, 3, 4]), tran("b", [2, 0], [1.09, 9, 20])];
    const xau = [tran("d", [2, 0], [1.4, 3, 4], false), tran("e", [2, 0], null), tran("f", null, [1.4, 3, 4]), tran("g", [1, 1], [2, 3.4, 3]), tran("h", [1, 0], [0, 0, 0])];
    expect(xienDoiThang([...xau, ...tot])?.chan.map((c) => c.h.slug)).toEqual(["a", "b"]);
  });
  it("chỉ 1 chân thì không dựng xiên", () => {
    expect(xienDoiThang([tran("a", [2, 0], [1.5, 3, 4])])).toBeNull();
  });
  it("tối đa 8 chân", () => {
    expect(xienDoiThang(Array.from({ length: 11 }, (_, i) => tran(`t${i}`, [1, 0], [1.3, 3, 4])))?.chan).toHaveLength(8);
  });
});

describe("xiên thị trường phụ", () => {
  const ds = ["a", "b", "c"].map((s) => tran(s, [1, 0], [1.5, 3, 4]));
  const keo: Record<string, { pOu?: { tip: string; keo: number[] }; pBtts?: { tip: string; keo: number[] } }> = {
    a: { pOu: { tip: "Over 2.5", keo: [1.6, 2.2] }, pBtts: { tip: "BTTS Yes", keo: [1.7, 2.0] } },
    b: { pOu: { tip: "Under 2.5", keo: [2.4, 1.5] }, pBtts: { tip: "BTTS No", keo: [2.1, 1.62] } },
  };
  it("Tài lấy tỷ lệ đầu, Xỉu lấy tỷ lệ sau; trận không ghi thì bỏ", () => {
    expect(xienTaiXiu(ds, (s) => keo[s])?.chan.map((c) => `${c.h.slug}:${c.cua}:${c.gia}`)).toEqual(["a:tai:1.6", "b:xiu:1.5"]);
  });
  it("hai đội ghi bàn: Có lấy tỷ lệ đầu, Không lấy tỷ lệ sau", () => {
    expect(xienHaiDoiGhi(ds, (s) => keo[s])?.chan.map((c) => `${c.h.slug}:${c.cua}:${c.gia}`)).toEqual(["a:co:1.7", "b:khong:1.62"]);
  });
  it("tip lạ hoặc thiếu tỷ lệ thì bỏ chân đó", () => {
    expect(xienTaiXiu(ds, (s) => (s === "a" ? { pOu: { tip: "?", keo: [1.5, 2] } } : s === "b" ? { pOu: { tip: "Over 2.5", keo: [] } } : keo.a))).toBeNull();
  });
});

describe("cacXienNgay", () => {
  it("gom theo giải, giải nhiều trận đứng trước, giải 1 trận không có xiên", () => {
    const rows = [
      tran("x", [1, 0], [1.5, 3, 4], true, "Cúp Nhà Vua"),
      tran("a", [1, 0], [1.5, 3, 4], true, "Nations League"),
      tran("b", [0, 2], [4, 3, 1.6], true, "Nations League"),
      tran("y", [1, 0], [1.5, 3, 4], true, "Cúp Nhà Vua"),
      tran("c", [1, 0], [1.2, 3, 4], true, "Nations League"),
      tran("z", [1, 0], [1.5, 3, 4], true, "Giao hữu"),
    ];
    const kq = cacXienNgay(rows, (s) => (s === "a" || s === "b" ? { pOu: { tip: "Over 2.5", keo: [1.5, 2.4] } } : null));
    expect(kq.map((x) => `${x.khoa}:${x.xien.chan.length}`)).toEqual(["nations-league-thang:3", "nations-league-tai-xiu:2", "cup-nha-vua-thang:2"]);
  });
  it("không có trận thì mảng rỗng", () => {
    expect(cacXienNgay([], () => null)).toEqual([]);
  });
});
