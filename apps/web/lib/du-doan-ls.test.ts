// Dòng từ bài đã đá mà bảng fixtures chưa có tỷ số → bù từ livescore (tên Anh ↔ tên gốc trong tệp dự đoán).
import { describe, expect, it } from "vitest";
import { dungMuc } from "./du-doan-cham";
import { boSungTySoLS } from "./du-doan-ls";
import type { TranLS } from "./ket-qua";
import type { AnalysisArticle } from "./types";

const bai = (slug: string, ko: string, home: string, away: string, hg = 2, ag = 1): AnalysisArticle =>
  ({
    slug, title: "t", kind: "preview", league: "x", byline: "Curator", published_at: "2026-11-10T03:00:00Z",
    du_doan: { home, away, kickoff_utc: ko, home_goals: hg, away_goals: ag },
  }) as unknown as AnalysisArticle;

const VN = bai("nhan-dinh-viet-nam-vs-dai-bac-trung-hoa-11-11-2026", "2026-11-11T12:00:00Z", "Vietnam", "Chinese Taipei");
const U23 = bai("nhan-dinh-u23-viet-nam-vs-u23-thai-lan-10-11-2026", "2026-11-10T12:00:00Z", "Vietnam U23", "Thailand U23", 1, 0);
const BAY_GIO = Date.parse("2026-11-13T00:00:00Z");
const ls = (x: Partial<TranLS>): TranLS => ({ home: "Vietnam", away: "Chinese Taipei", kickoff: "2026-11-11T12:00:00Z", kq: [3, 0], ...x });
const muc = (...b: AnalysisArticle[]) => b.map((x) => dungMuc(x, [], BAY_GIO));

describe("boSungTySoLS", () => {
  it("khớp tên Anh trong tệp → điền tỷ số và chấm theo luật cũ", () => {
    const [m] = boSungTySoLS(muc(VN), [ls({})], BAY_GIO);
    expect(m.ketQua?.that).toMatchObject({ home_score: 3, away_score: 0 });
    expect([m.ketQua?.dungKetQua, m.ketQua?.dungTySo]).toEqual([true, false]);
  });

  it("đội tuyển U23 khớp đúng U23, không dính đội A cùng ngày", () => {
    const them = [ls({ home: "Vietnam", away: "Thailand", kickoff: "2026-11-10T12:00:00Z", kq: [4, 4] }), ls({ home: "Vietnam U23", away: "Thailand U23", kickoff: "2026-11-10T12:00:00Z", kq: [1, 0] })];
    const [m] = boSungTySoLS(muc(U23), them, BAY_GIO);
    expect([m.ketQua?.that.home_score, m.ketQua?.dungTySo]).toEqual([1, true]);
  });

  it("chỉ có đội A mà bài là U23 → để trống", () => {
    const [m] = boSungTySoLS(muc(U23), [ls({ home: "Vietnam", away: "Thailand", kickoff: "2026-11-10T12:00:00Z" })], BAY_GIO);
    expect(m.ketQua).toBeNull();
  });

  it("tên không khớp → null, không khớp bừa", () => {
    expect(boSungTySoLS(muc(VN), [ls({ away: "Taiwan" })], BAY_GIO)[0].ketQua).toBeNull();
  });

  it("ngược chiều sân nhà → null", () => {
    expect(boSungTySoLS(muc(VN), [ls({ home: "Chinese Taipei", away: "Vietnam" })], BAY_GIO)[0].ketQua).toBeNull();
  });

  it("giờ đá lệch quá 2 ngày → null", () => {
    expect(boSungTySoLS(muc(VN), [ls({ kickoff: "2026-11-15T12:00:00Z" })], BAY_GIO)[0].ketQua).toBeNull();
  });

  it("trận chưa đá thì không điền", () => {
    const truoc = Date.parse("2026-11-11T10:00:00Z");
    expect(boSungTySoLS([dungMuc(VN, [], truoc)], [ls({})], truoc)[0].ketQua).toBeNull();
  });

  it("dòng đã có tỷ số thì giữ nguyên, không đè", () => {
    const co = dungMuc(VN, [{ home: "Vietnam", away: "Chinese Taipei", kickoff_utc: "2026-11-11T12:00:00Z", home_score: 2, away_score: 1 }], BAY_GIO);
    expect(boSungTySoLS([co], [ls({})], BAY_GIO)[0].ketQua?.that.home_score).toBe(2);
  });
});
