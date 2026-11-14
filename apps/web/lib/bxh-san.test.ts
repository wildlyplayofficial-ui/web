import { describe, expect, it } from "vitest";
import { khopBangTong, tinhBxhSan, type TranDaDa } from "./bxh-san";
import { dauMua } from "./bxh-san-tai";

const T: TranDaDa[] = [
  { home: "A", away: "B", kq: [2, 0] },
  { home: "B", away: "C", kq: [1, 1] },
  { home: "C", away: "A", kq: [0, 3] },
  { home: "A", away: "C", kq: [1, 2] },
];

describe("tinhBxhSan", () => {
  it("sân nhà: tính riêng các trận đội đá làm chủ nhà", () => {
    const b = tinhBxhSan(T, "nha");
    const a = b.find((x) => x.name === "A")!;
    expect([a.played, a.won, a.lost, a.goals_for, a.goals_against, a.points]).toEqual([2, 1, 1, 3, 2, 3]);
    expect(b.map((x) => x.name)).toEqual(["A", "B", "C"]);
    expect(b.map((x) => x.rank)).toEqual([1, 2, 3]);
  });
  it("sân khách: đảo tỷ số, thắng khách được 3 điểm", () => {
    const b = tinhBxhSan(T, "khach");
    const c = b.find((x) => x.name === "C")!;
    expect([c.played, c.won, c.drawn, c.lost, c.goals_for, c.goals_against, c.goal_diff, c.points]).toEqual([2, 1, 1, 0, 3, 2, 1, 4]);
    expect(b.map((x) => x.name)).toEqual(["C", "A", "B"]);
  });
  it("hòa điểm thì xét hiệu số rồi bàn thắng", () => {
    const b = tinhBxhSan([{ home: "X", away: "Z", kq: [1, 0] }, { home: "Y", away: "Z", kq: [4, 3] }], "nha");
    expect(b.map((x) => x.name)).toEqual(["Y", "X"]);
  });
  it("ép đủ đội, đội chưa đá sân đó nằm cuối với 0 trận", () => {
    const b = tinhBxhSan([{ home: "A", away: "B", kq: [1, 0] }], "khach", ["A", "B", "Q"]);
    expect(b.find((x) => x.name === "Q")?.played).toBe(0);
    expect(b).toHaveLength(3);
  });
});

describe("khopBangTong", () => {
  const tong = tinhBxhSan(T, "nha").map((n) => {
    const k = tinhBxhSan(T, "khach").find((x) => x.name === n.name)!;
    return { ...n, played: n.played + k.played, points: n.points + k.points };
  });
  it("khớp khi nhà + khách = tổng", () => {
    expect(khopBangTong(tong, tinhBxhSan(T, "nha"), tinhBxhSan(T, "khach"))).toBe(true);
  });
  it("lệch số trận (thiếu dữ liệu) thì không tin", () => {
    expect(khopBangTong(tong, tinhBxhSan(T.slice(1), "nha"), tinhBxhSan(T, "khach"))).toBe(false);
    expect(khopBangTong([], [], [])).toBe(false);
  });
});

describe("dauMua", () => {
  it("từ tháng 7 trở đi lấy năm nay, trước đó lấy năm trước", () => {
    expect(dauMua(new Date("2026-11-14T00:00:00Z"))).toBe("2026-07-01");
    expect(dauMua(new Date("2027-03-02T00:00:00Z"))).toBe("2026-07-01");
  });
});
