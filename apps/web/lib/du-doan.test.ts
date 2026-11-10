// Chạy: vitest run (web chưa cài vitest — mượn bản của apps/worker, xem báo cáo commit).
import { describe, expect, it } from "vitest";
import { duDoanCua, type DuDoanDayDu } from "./du-doan-nguon";
import { cham, duDoanChot, timTySo } from "./du-doan-cham";

const VN = "nhan-dinh-viet-nam-vs-dai-bac-trung-hoa-11-11-2026";
const TEP: Record<string, DuDoanDayDu> = {
  "a-vs-b": { home: "A FC", away: "B", kickoff_utc: "2026-11-11T12:00:00Z", home_goals: 2, away_goals: 1, home_vi: "Đội A" },
};

describe("duDoanCua", () => {
  it("rơi về tệp JSON khi cột du_doan trống", () => {
    expect(duDoanCua({ slug: "a-vs-b", du_doan: undefined }, TEP)?.home_goals).toBe(2);
  });

  it("cột du_doan thắng tệp nhưng giữ tên tiếng Việt từ tệp", () => {
    const d = duDoanCua(
      { slug: "a-vs-b", du_doan: { home: "A FC", away: "B", kickoff_utc: "2026-11-11T12:00:00Z", home_goals: 0, away_goals: 0 } },
      TEP,
    );
    expect([d?.home_goals, d?.home_vi]).toEqual([0, "Đội A"]);
  });

  it("không có ở cả hai nguồn thì null", () => {
    expect(duDoanCua({ slug: "khong-co", du_doan: null }, TEP)).toBeNull();
  });

  it("tệp thật có bài Việt Nam vs Đài Bắc Trung Hoa, đoán 2-1, đá 19h VN 11/11", () => {
    const d = duDoanCua({ slug: VN, du_doan: undefined });
    expect([d?.home_goals, d?.away_goals, d?.kickoff_utc]).toEqual([2, 1, "2026-11-11T12:00:00Z"]);
  });
});

describe("chấm dự đoán từ tệp", () => {
  const bai = { slug: VN, du_doan: undefined, published_at: "2026-11-10T03:00:00Z" };

  it("bài đăng trước giờ đá thì được chốt", () => {
    expect(duDoanChot(bai)).not.toBeNull();
  });

  it("bài đăng sau giờ đá thì không chấm", () => {
    expect(duDoanChot({ ...bai, published_at: "2026-11-11T13:00:00Z" })).toBeNull();
  });

  it("đoán 2-1, thật 3-1 → đúng kết quả, sai tỷ số", () => {
    const chot = duDoanChot(bai)!;
    expect(cham(chot, { home_score: 3, away_score: 1 })).toEqual({ dungKetQua: true, dungTySo: false });
  });

  it("đoán 2-1, thật 1-1 → sai kết quả", () => {
    expect(cham(duDoanChot(bai)!, { home_score: 1, away_score: 1 }).dungKetQua).toBe(false);
  });

  it("tìm tỷ số thật theo tên nguồn (Vietnam / Chinese Taipei)", () => {
    const that = timTySo(duDoanChot(bai)!, [
      { home: "Vietnam", away: "Chinese Taipei", kickoff_utc: "2026-11-11T12:00:00Z", home_score: 2, away_score: 1 },
    ]);
    expect(that?.home_score).toBe(2);
  });
});
