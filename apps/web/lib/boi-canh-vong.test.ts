import { describe, expect, it } from "vitest";
import { boiCanhVongToi, hangCua } from "./boi-canh-vong";
import type { StandingTeam } from "./standings";

const doi = (rank: number, name: string, points: number, played = 4): StandingTeam => ({
  rank, name, points, played, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_diff: 0, form: "", groupName: "", stageName: "",
});
const bang = [doi(1, "Arsenal", 12), doi(2, "Bayern Munich", 10), doi(20, "LASK", 3), doi(9, "Real Madrid", 7)];

describe("boiCanhVongToi", () => {
  it("nêu đội đầu bảng kèm điểm và số trận", () => {
    expect(boiCanhVongToi([{ homeName: "Arsenal", awayName: "LASK" }], bang, "Cúp C1")).toContain("Arsenal đứng đầu Cúp C1 với 12 điểm sau 4 trận");
  });
  it("xếp cặp hạng cao lên trước", () => {
    const s = boiCanhVongToi([{ homeName: "LASK", awayName: "Real Madrid" }, { homeName: "Arsenal", awayName: "Bayern Munich" }], bang, "C1")!;
    expect(s.indexOf("Arsenal (hạng 1)")).toBeLessThan(s.indexOf("LASK (hạng 20)"));
  });
  it("nêu chênh lệch điểm lớn nhất", () => {
    expect(boiCanhVongToi([{ homeName: "Arsenal", awayName: "LASK" }], bang, "C1")).toContain("Arsenal hơn LASK 9 điểm");
  });
  it("không có bảng thì trả null", () => {
    expect(boiCanhVongToi([{ homeName: "Arsenal", awayName: "LASK" }], [], "C1")).toBeNull();
  });
  it("không khớp đội nào thì trả null", () => {
    expect(boiCanhVongToi([{ homeName: "Ajax", awayName: "Celtic" }], bang, "C1")).toBeNull();
  });
  it("hangCua khớp tên lệch giữa lịch và BXH", () => {
    const b = [doi(4, "Bayern München", 9), doi(6, "Napoli", 8), doi(7, "Paris Saint-Germain", 8)];
    expect(hangCua(b, "Bayern Munich")?.rank).toBe(4);
    expect(hangCua(b, "SSC Napoli")?.rank).toBe(6);
    expect(hangCua(b, "Paris Saint Germain")?.rank).toBe(7);
    expect(hangCua(b, "Real Madrid")).toBeUndefined();
    const c = [doi(25, "Bodo/Glimt", 4), doi(34, "Slavia Praha", 2)];
    expect(hangCua(c, "Bodoe/Glimt")?.rank).toBe(25);
    expect(hangCua(c, "Slavia Prague")?.rank).toBe(34);
  });
  it("hangCua bỏ qua hoa thường và dấu", () => {
    expect(hangCua(bang, "real madrid")?.rank).toBe(9);
  });
});
