import { describe, expect, it } from "vitest";
import { CHI_SO, dau, demTran, NHOM, xepChiSo } from "./chi-so-doi";
import type { DoiXg, TranDoi } from "./xg-doi";

const t = (bt: number, bb: number): TranDoi => ({ ngay: "2026-11-01", dt: "X", san: "N", bt, bb });
const doi = (ten: string, gan: TranDoi[], o: Partial<DoiXg> = {}): DoiXg => ({
  id: ten, ten, logo: "", hang: 1, diem: 0, tran: gan.length, th: 0, h: 0, b: 0,
  xg: 1, xga: 1, chenh: 0, bt: 1, bb: 1, sut: 4, ks: 50, gan, ...o,
});
const cs = (id: string) => {
  const c = CHI_SO.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("demTran", () => {
  it("đếm sạch lưới, tịt ngòi, BTTS và Over 2.5 trên danh sách trận", () => {
    expect(demTran([t(2, 0), t(1, 1), t(0, 3), t(2, 2)])).toEqual({ n: 4, sachLuoi: 1, khongGhi: 1, btts: 50, over25: 50, tbBan: 2.75 });
  });
  it("không trận nào thì trả 0, không chia cho 0", () => {
    expect(demTran([])).toEqual({ n: 0, sachLuoi: 0, khongGhi: 0, btts: 0, over25: 0, tbBan: 0 });
  });
});

describe("xepChiSo", () => {
  it("chỉ số lớn là tốt xếp giảm dần", () => {
    const ds = [doi("A", [t(1, 1)]), doi("B", [t(1, 0), t(2, 0)])];
    expect(xepChiSo(cs("sach-luoi"), ds).map((x) => [x.doi.ten, x.chu])).toEqual([["B", "2/2"], ["A", "0/1"]]);
  });
  it("chỉ số nhỏ là tốt (xGA) xếp tăng dần", () => {
    const ds = [doi("A", [], { xga: 1.4 }), doi("B", [], { xga: 0.8 })];
    expect(xepChiSo(cs("xga"), ds).map((x) => x.doi.ten)).toEqual(["B", "A"]);
  });
  it("hòa số thì theo tên cho thứ tự ổn định", () => {
    expect(xepChiSo(cs("kiem-soat"), [doi("Z", []), doi("A", [])]).map((x) => x.doi.ten)).toEqual(["A", "Z"]);
  });
});

describe("danh mục", () => {
  it("mỗi nhóm có ít nhất 1 chỉ số và id không trùng", () => {
    for (const n of NHOM) expect(CHI_SO.some((c) => c.nhom === n.id)).toBe(true);
    expect(new Set(CHI_SO.map((c) => c.id)).size).toBe(CHI_SO.length);
  });
  it("dau() ghi dấu đúng", () => {
    expect([dau(0.42), dau(-0.3), dau(0)]).toEqual(["+0.42", "−0.30", "±0.00"]);
  });
});
