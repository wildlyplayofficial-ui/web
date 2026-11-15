import { describe, expect, it } from "vitest";
import { dongDanDau, duDoanCuaGiai } from "./giai-dan-dau";
import type { StandingTeam } from "./standings";

const doi = (rank: number, name: string, points: number, played: number, groupName = ""): StandingTeam => ({
  rank, name, played, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_diff: 0,
  points, form: "", groupName, stageName: "",
});

describe("dongDanDau", () => {
  it("lấy đội hạng 1 kèm điểm và số trận", () => {
    expect(dongDanDau([doi(2, "Chelsea", 25, 12), doi(1, "Arsenal", 28, 12)])).toBe("Arsenal dẫn đầu với 28 điểm sau 12 trận.");
  });
  it("bảng rỗng thì không có dòng nào", () => {
    expect(dongDanDau([])).toBeNull();
  });
  it("bảng chia nhiều bảng đấu thì bỏ qua", () => {
    expect(dongDanDau([doi(1, "A", 3, 1, "Group A"), doi(1, "B", 3, 1, "Group B")])).toBeNull();
  });
  it("chưa đá trận nào thì bỏ qua", () => {
    expect(dongDanDau([doi(1, "A", 0, 0)])).toBeNull();
  });
});

describe("duDoanCuaGiai", () => {
  it("premier-league trỏ về ngoai-hang-anh", () => {
    expect(duDoanCuaGiai("premier-league")).toEqual({ slug: "ngoai-hang-anh", ten: "Ngoại hạng Anh" });
  });
  it("giải không có trang dự đoán trả null", () => {
    expect(duDoanCuaGiai("world-cup-2026")).toBeNull();
  });
});
