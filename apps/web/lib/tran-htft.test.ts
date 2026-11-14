// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { cauDiem, cauHtft, cuaNoiNhat, docDiem, docHtft, KHOA_HTFT, nhanCua, xacSuatTheoHang } from "./tran-htft";

const ODDS = { HH: 2.45, DH: 4.15, AH: 30, DD: 4.85, HD: 19, AD: 19, AA: 11, DA: 12.5, HA: 54 };

describe("docHtft — 9 tỷ lệ hiệp 1 / cả trận", () => {
  it("đủ 9 ô → mảng theo thứ tự hàng hiệp 1, cột cả trận", () => {
    expect(docHtft(ODDS)).toEqual([2.45, 19, 54, 4.15, 4.85, 12.5, 30, 19, 11]);
    expect(KHOA_HTFT).toHaveLength(9);
  });
  it("thiếu ô, ô ≤ 1 hoặc không phải số → null (khối ẩn)", () => {
    expect(docHtft(undefined)).toBeNull();
    expect(docHtft({ ...ODDS, HA: undefined as unknown as number })).toBeNull();
    expect(docHtft({ ...ODDS, DD: 0 })).toBeNull();
    expect(docHtft({ ...ODDS, DD: Number.NaN })).toBeNull();
  });
});

describe("cửa nổi nhất + câu tiếng Việt", () => {
  it("tỷ lệ thấp nhất là cửa nổi nhất", () => {
    expect(cuaNoiNhat(ODDS)).toBe("HH");
    expect(cauHtft(ODDS, "Uganda", "Botswana")).toBe("Cửa có tỷ lệ thấp nhất: Uganda dẫn hiệp 1 và thắng cả trận (⟦2.45⟧).");
  });
  it("nhãn các kiểu cửa", () => {
    expect(nhanCua("DH", "Uganda", "Botswana")).toBe("Hòa hiệp 1, Uganda thắng cả trận");
    expect(nhanCua("DD", "Uganda", "Botswana")).toBe("Hòa hiệp 1, hòa cả trận");
    expect(nhanCua("AH", "Uganda", "Botswana")).toBe("Botswana dẫn hiệp 1, Uganda thắng cả trận");
    expect(nhanCua("HD", "Uganda", "Botswana")).toBe("Uganda dẫn hiệp 1, hòa cả trận");
    expect(nhanCua("AA", "Uganda", "Botswana")).toBe("Botswana dẫn hiệp 1 và thắng cả trận");
  });
  it("thiếu dữ liệu → null", () => {
    expect(cauHtft(undefined, "A", "B")).toBeNull();
    expect(cuaNoiNhat({ HH: 2 })).toBeNull();
  });
});

describe("xacSuatTheoHang", () => {
  it("mỗi nhóm cộng ~100%, nhà thắng cả trận cao nhất khi tỷ lệ nhà thấp", () => {
    const x = xacSuatTheoHang(ODDS)!;
    expect(x.hiep1.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99);
    expect(x.hiep1.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(101);
    expect(x.catran[0]).toBeGreaterThan(x.catran[1]);
    expect(x.catran[0]).toBeGreaterThan(x.catran[2]);
  });
  it("thiếu dữ liệu → null", () => {
    expect(xacSuatTheoHang({})).toBeNull();
  });
});

describe("điểm tấn công / phòng ngự", () => {
  it("cặp số nguyên 1–10 hợp lệ", () => {
    expect(docDiem([5, 4])).toEqual([5, 4]);
    expect(docDiem([10, 8])).toEqual([10, 8]);
    expect(cauDiem("Uganda", [8, 7])).toBe("Uganda tấn công 8/10, phòng ngự 7/10.");
  });
  it("ngoài thang, thiếu, sai độ dài → null (không bịa số)", () => {
    expect(docDiem([0, 3])).toBeNull();
    expect(docDiem([11, 3])).toBeNull();
    expect(docDiem([3])).toBeNull();
    expect(docDiem(undefined)).toBeNull();
    expect(cauDiem("X", [2.5, 3])).toBeNull();
  });
});
