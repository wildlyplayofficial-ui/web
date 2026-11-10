// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { chieuDuDoan, mauChieu, mauKQ, phongDo, type TranDaDa } from "./phong-do";

const tran = (home: string, away: string, ngay: string, h: number, a: number): TranDaDa => ({
  home, away, kickoff_utc: `2026-${ngay}T12:00:00Z`, home_score: h, away_score: a,
});

const SAU = [
  tran("Vietnam", "Laos", "10-01", 3, 0),
  tran("Malaysia", "Vietnam", "10-05", 1, 1),
  tran("Vietnam FC", "Thailand", "10-09", 0, 2),
  tran("Vietnam", "Thailand", "10-09", 0, 2), // dòng trùng cùng trận ngày 9/10
  tran("Vietnam", "Nepal", "10-12", 2, 1),
  tran("India", "Vietnam", "10-14", 0, 1),
  tran("Vietnam", "Japan", "11-20", 0, 5), // SAU trận dự đoán → không tính
];

describe("phongDo", () => {
  it("5 trận gần nhất trước giờ đá, mới nhất trước, đúng góc nhìn đội", () => {
    expect(phongDo(SAU, "Vietnam", "2026-11-11T12:00:00Z")).toEqual(["T", "T", "B", "H", "T"]);
  });

  it("không đủ 5 trận thì null (không hiện ô)", () => {
    expect(phongDo(SAU, "Laos", "2026-11-11T12:00:00Z")).toBeNull();
  });

  it("đội không có trong bảng thì null", () => {
    expect(phongDo(SAU, "Chinese Taipei", "2026-11-11T12:00:00Z")).toBeNull();
  });
});

describe("màu ô dự đoán", () => {
  it("2-1 nhà thắng → xanh", () => {
    expect([chieuDuDoan([2, 1]), mauChieu(chieuDuDoan([2, 1]))]).toEqual(["nha", mauKQ("T")]);
  });

  it("1-1 hoà → vàng", () => {
    expect(mauChieu(chieuDuDoan([1, 1]))).toContain("amber");
  });

  it("0-2 khách thắng → hồng", () => {
    expect(mauChieu(chieuDuDoan([0, 2]))).toContain("pink");
  });
});
