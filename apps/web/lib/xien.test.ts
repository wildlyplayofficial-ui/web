import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { cacXienNgay, xienTaiXiu, xienTrongNgay } from "./xien";

const tran = (slug: string, du: [number, number] | null, mot: [number, number, number] | null, sapDa = true, giai = "Giao hữu") =>
  ({ slug, du, mot, sapDa, giai, kickoffUtc: "2026-11-12T19:45:00Z" }) as HangDuDoan;

describe("xienTrongNgay", () => {
  it("lấy cửa dự đoán, xếp tỷ lệ thấp trước", () => {
    const kq = xienTrongNgay([tran("a", [2, 0], [1.8, 3.5, 4]), tran("b", [0, 1], [5, 3.6, 1.5]), tran("c", [1, 0], [1.3, 5, 9])]);
    expect(kq?.chan.map((c) => `${c.h.slug}:${c.cua}`)).toEqual(["c:0", "b:2", "a:0"]);
  });
  it("tỷ lệ gộp là tích các chân", () => {
    const kq = xienTrongNgay([tran("a", [2, 0], [2, 3, 4]), tran("b", [2, 0], [1.5, 3, 4]), tran("c", [2, 0], [1.25, 3, 4])]);
    expect(kq?.tong).toBeCloseTo(3.75);
  });
  it("bỏ trận đã đá, thiếu tỷ lệ, thiếu tỷ số dự đoán, tỷ lệ ngoài khoảng", () => {
    const tot = [tran("a", [2, 0], [1.5, 3, 4]), tran("b", [2, 0], [1.6, 3, 4]), tran("c", [2, 0], [1.7, 3, 4])];
    const xau = [tran("d", [2, 0], [1.4, 3, 4], false), tran("e", [2, 0], null), tran("f", null, [1.4, 3, 4]), tran("g", [1, 1], [2, 3.4, 3]), tran("h", [3, 0], [1.05, 9, 20])];
    expect(xienTrongNgay([...xau, ...tot])?.chan.map((c) => c.h.slug)).toEqual(["a", "b", "c"]);
  });
  it("dưới 3 chân thì không dựng xiên", () => {
    expect(xienTrongNgay([tran("a", [2, 0], [1.5, 3, 4]), tran("b", [2, 0], [1.6, 3, 4])])).toBeNull();
  });
  it("tối đa 5 chân", () => {
    const ds = Array.from({ length: 8 }, (_, i) => tran(`t${i}`, [1, 0], [1.3 + i / 10, 3, 4]));
    expect(xienTrongNgay(ds)?.chan).toHaveLength(5);
  });
});

describe("xienTaiXiu", () => {
  const ds = ["a", "b", "c", "d"].map((s) => tran(s, [1, 0], [1.5, 3, 4]));
  const keo: Record<string, { tip: string; keo: number[] }> = {
    a: { tip: "Over 2.5", keo: [1.6, 2.2] },
    b: { tip: "Under 2.5", keo: [2.4, 1.5] },
    c: { tip: "Over 2.5", keo: [1.4, 2.9] },
  };
  it("Tài lấy tỷ lệ đầu, Xỉu lấy tỷ lệ sau; trận không ghi tài xỉu thì bỏ", () => {
    const kq = xienTaiXiu(ds, (s) => keo[s]);
    expect(kq?.chan.map((c) => `${c.h.slug}:${c.cua}:${c.gia}`)).toEqual(["c:tai:1.4", "b:xiu:1.5", "a:tai:1.6"]);
  });
  it("trận đã đá không vào xiên", () => {
    expect(xienTaiXiu([...ds.slice(0, 2), tran("c", [1, 0], [1.5, 3, 4], false)], (s) => keo[s])).toBeNull();
  });
});

describe("cacXienNgay", () => {
  const khong = () => null;
  it("3 trận: chỉ có xiên 3, không lặp thành xiên 5", () => {
    const ds = Array.from({ length: 3 }, (_, i) => tran(`t${i}`, [1, 0], [1.3 + i / 10, 3, 4]));
    expect(cacXienNgay(ds, khong).map((x) => x.khoa)).toEqual(["xien-3"]);
  });
  it("đủ 5 trận có cả xiên 3 lẫn xiên 5; giải lớn đủ 3 trận có xiên riêng", () => {
    const ds = Array.from({ length: 6 }, (_, i) => tran(`t${i}`, [1, 0], [1.3 + i / 10, 3, 4], true, i < 3 ? "Ngoại hạng Anh" : "Giao hữu"));
    const kq = cacXienNgay(ds, khong);
    expect(kq.map((x) => x.khoa)).toEqual(["xien-3", "xien-5", "ngoai-hang-anh"]);
    expect(kq[2].ten).toBe("Xiên 3 Ngoại hạng Anh");
  });
  it("ngày không đủ trận thì rỗng", () => {
    expect(cacXienNgay([tran("a", [1, 0], [1.5, 3, 4])], khong)).toEqual([]);
  });
});
