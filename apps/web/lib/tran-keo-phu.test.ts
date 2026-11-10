// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { cauChuoi, cauTySo, demChuoi, docChuoi } from "./tran-keo-phu";

describe("docChuoi — chuỗi 5 trận Y/N hoặc O/U", () => {
  it("đọc Y/N thành có/không, giữ chiều cũ → mới", () => {
    expect(docChuoi("YYNNY", "Y")).toEqual([true, true, false, false, true]);
  });
  it("chuỗi có ký tự lạ hoặc rỗng → null (khối không vẽ)", () => {
    expect(docChuoi("", "Y")).toBeNull();
    expect(docChuoi("YX", "Y")).toBeNull();
  });
});

describe("demChuoi", () => {
  it("đếm số trận đạt", () => {
    expect(demChuoi("UOOUO", "O")).toBe(3);
  });
});

describe("cauChuoi — câu tiếng Việt cho khối hai đội ghi bàn / tài xỉu", () => {
  it("hai đội ghi bàn", () => {
    expect(cauChuoi("btts", "Arsenal", "YYNNY", "Chelsea", "YNYNY")).toBe(
      "Arsenal có 3/5 trận gần nhất cả hai đội cùng ghi bàn, Chelsea có 3/5.",
    );
  });
  it("tài xỉu", () => {
    expect(cauChuoi("ou", "Arsenal", "OOOOU", "Chelsea", "UUUUU")).toBe(
      "Arsenal có 4/5 trận gần nhất trên 2,5 bàn, Chelsea có 0/5.",
    );
  });
  it("thiếu chuỗi một đội thì chỉ nói đội còn lại", () => {
    expect(cauChuoi("ou", "Arsenal", "OOOOU", "Chelsea", "")).toBe("Arsenal có 4/5 trận gần nhất trên 2,5 bàn.");
  });
  it("thiếu cả hai → null", () => {
    expect(cauChuoi("btts", "A", "", "B", "")).toBeNull();
  });
});

describe("cauTySo — tỷ số chính xác", () => {
  it("đọc tip kiểu PredictZ thành câu có tỷ lệ", () => {
    expect(cauTySo("Draw 2-2", [12])).toBe("Tỷ số dự đoán: 2-2 · tỷ lệ 12.00");
  });
  it("không có tỷ lệ thì bỏ vế tỷ lệ", () => {
    expect(cauTySo("Home 2-1", [])).toBe("Tỷ số dự đoán: 2-1");
  });
  it("tip không có tỷ số → null", () => {
    expect(cauTySo("Draw", [3])).toBeNull();
  });
});
