import { describe, expect, it } from "vitest";
import { cauDnb, cauKqBtts, cauKqOu, docDnb, docKqBtts, docKqOu, oThapNhat } from "./tran-keo3";

const btts = { nY: 4.8, nN: 2.22, kY: 15, kN: 8.6, hY: 6.4, hN: 7.4 };
const ou = { nT: 3.1, nX: 3.01, kT: 14.75, kX: 10, hT: 23, hX: 4.1 };

describe("tran-keo3", () => {
  it("docDnb nhận 2 số > 1, còn lại null", () => {
    expect(docDnb([1.19, 4.6])).toEqual([1.19, 4.6]);
    expect(docDnb([1, 4])).toBeNull();
    expect(docDnb(undefined)).toBeNull();
  });
  it("docKqBtts / docKqOu đủ 6 ô mới nhận", () => {
    expect(docKqBtts(btts)).toEqual(btts);
    expect(docKqBtts({ ...btts, hN: 0 })).toBeNull();
    expect(docKqOu(ou)).toEqual(ou);
    expect(docKqOu(undefined)).toBeNull();
  });
  it("oThapNhat chọn ô tỷ lệ thấp nhất", () => {
    expect(oThapNhat(btts)).toBe("nN");
    expect(oThapNhat(ou)).toBe("nX");
  });
  it("câu giải thích nêu cửa thấp nhất và không có tên nhà cái", () => {
    expect(cauDnb([1.19, 4.6], "Uganda", "Botswana")).toContain("Uganda thắng (⟦1.19⟧)");
    expect(cauKqBtts(btts, "Uganda", "Botswana")).toContain("Uganda thắng, không phải cả hai đội cùng ghi bàn (⟦2.22⟧)");
    expect(cauKqOu(ou, "Uganda", "Botswana")).toContain("Under (tối đa 2 bàn) (⟦3.01⟧)");
  });
});
