// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { cacTranChon } from "./chon-tran";
import type { AnalysisArticle } from "./types";

const bai = (slug: string, league: string, home: string, away: string, ko: string) =>
  ({
    slug, league, kind: "preview", title: `${home} vs ${away}`, byline: "Chú Tám", published_at: "2026-11-01T00:00:00Z",
    du_doan: { home, away, kickoff_utc: ko, home_goals: 1, away_goals: 0 },
  }) as unknown as AnalysisArticle;

const DS = [
  bai("a-vs-b", "Premier League", "Arsenal", "Chelsea", "2026-11-12T20:00:00Z"), // 03:00 13/11 VN
  bai("c-vs-d", "Friendly", "Japan", "Korea", "2026-11-11T10:00:00Z"),
  bai("e-vs-f", "Premier League", "Leeds", "Fulham", "2026-11-11T12:00:00Z"),
  bai("g-vs-h", "Premier League", "Spurs", "Everton", "2026-11-08T12:00:00Z"), // đã qua
  { ...bai("khong-phai", "X", "A", "B", "2026-11-11T12:00:00Z"), slug: "khong-co-vs" , kind: "review" } as AnalysisArticle,
];
const NOW = Date.parse("2026-11-10T06:00:00Z");

describe("cacTranChon", () => {
  const ds = cacTranChon(DS, NOW);
  it("ngày theo giờ VN: sắp tới trước (gần nhất trước), đã qua sau", () => {
    expect(ds.map((n) => n.ngay)).toEqual(["2026-11-11", "2026-11-13", "2026-11-08"]);
  });
  it("trong ngày gom theo giải, giữ thứ tự giờ đá", () => {
    expect(ds[0].giai.map((g) => g.ten)).toEqual(["Friendly", "Premier League"]);
  });
  it("nhãn giờ VN + ngày + hai đội", () => {
    expect(ds[1].giai[0].tran[0]).toEqual({ slug: "a-vs-b", nhan: "03:00 13/11 · Arsenal vs Chelsea" });
  });
  it("bỏ bài không phải dự đoán", () => {
    expect(ds.flatMap((n) => n.giai.flatMap((g) => g.tran)).some((t) => t.slug === "khong-co-vs")).toBe(false);
  });
});
