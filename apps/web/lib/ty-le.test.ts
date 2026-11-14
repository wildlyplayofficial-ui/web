import { describe, expect, it } from "vitest";
import { doiTyLe, kieuMy, phanSo } from "./ty-le";

describe("phanSo", () => {
  it.each([[1.6, "3/5"], [2, "1/1"], [3.5, "5/2"], [1.5, "1/2"], [1.25, "1/4"], [6.4, "27/5"], [1.91, "10/11"], [11, "10/1"]])("%s -> %s", (d, kq) => {
    expect(phanSo(d)).toBe(kq);
  });
});

describe("kieuMy", () => {
  it.each([[2, "+100"], [3.7, "+270"], [6.4, "+540"], [1.5, "-200"], [1.6, "-167"], [1.25, "-400"]])("%s -> %s", (d, kq) => {
    expect(kieuMy(d)).toBe(kq);
  });
});

describe("doiTyLe", () => {
  it("thập phân giữ 2 chữ số", () => expect(doiTyLe(1.6, "D")).toBe("1.60"));
  it("giá trị không hợp lệ không vỡ", () => expect(doiTyLe(NaN, "F")).toBe(""));
});
