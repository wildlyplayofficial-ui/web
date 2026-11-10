// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import clubBadges from "./data/club-badges.json";
import { teamBadge } from "./team-badges";

const CLB: Record<string, string> = clubBadges;

describe("teamBadge — tên ngắn trong tệp dự đoán tuần", () => {
  it.each([
    ["Aldershot", "Aldershot Town"],
    ["Boston Utd", "Boston United"],
    ["Carlisle", "Carlisle United"],
    ["Cheltenham", "Cheltenham Town"],
    ["Colchester", "Colchester United"],
    ["Crewe", "Crewe Alexandra"],
    ["DJK Vilzing", "Vilzing"],
    ["Exeter", "Exeter City"],
  ])("%s ra logo của %s", (ngan, chuan) => {
    expect(teamBadge(ngan)).toBe(CLB[chuan]);
  });

  it("tên không dấu ra logo của tên có dấu", () => {
    expect(teamBadge("Atletico Nacional")).toBe(CLB["Atlético Nacional"]);
  });

  it("Bắc Ireland ra cờ riêng, không phải cờ Ireland", () => {
    expect(teamBadge("Northern Ireland")).toBe("https://flagcdn.com/w160/gb-nir.png");
  });

  it("tên ngắn không có trong bảng thì không đoán bừa", () => {
    expect(teamBadge("Oxford")).toBeNull();
  });
});
