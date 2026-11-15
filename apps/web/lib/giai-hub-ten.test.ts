import { describe, expect, it } from "vitest";
import { tenDayDu } from "./giai-hub";

const BANG = ["Manchester City", "Manchester United", "Leeds United", "Coventry City", "Tottenham Hotspur", "Ipswich Town", "Nottingham Forest", "Brighton & Hove Albion"];

describe("tenDayDu", () => {
  it("tên ngắn tệp dự đoán ra tên BXH", () => {
    expect(["Man City", "Man Utd", "Leeds", "Coventry", "Tottenham", "Ipswich", "Nott'm Forest", "Brighton"].map((t) => tenDayDu(t, BANG))).toEqual([
      "Manchester City", "Manchester United", "Leeds United", "Coventry City", "Tottenham Hotspur", "Ipswich Town", "Nottingham Forest", "Brighton & Hove Albion",
    ]);
  });
  it("khớp nhiều đội thì bỏ, không đoán", () => {
    expect(tenDayDu("Man", BANG)).toBeNull();
  });
  it("không khớp đội nào trả null", () => {
    expect(tenDayDu("Chelsea", BANG)).toBeNull();
  });
});
