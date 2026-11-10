// Chạy: vitest run (mượn vitest của apps/worker như du-doan.test.ts).
import { describe, expect, it } from "vitest";
import { dungMuc, type TySoThat } from "./du-doan-cham";
import { cauDuDoan, cauHoiDuDoan, faqSchema, jsonLd, metaDuDoan, suKienTran } from "./du-doan-schema";
import type { HangDuDoan } from "./du-doan-hang";
import type { AnalysisArticle } from "./types";

const VN = "nhan-dinh-viet-nam-vs-dai-bac-trung-hoa-11-11-2026";
const BAI = {
  slug: VN,
  kind: "preview",
  title: "Nhận định Việt Nam vs Đài Bắc Trung Hoa",
  byline: "Chú Tám",
  published_at: "2026-11-10T03:00:00Z",
  du_doan: null,
} as unknown as AnalysisArticle;
const SAU_TRAN = Date.parse("2026-11-11T15:00:00Z");
const that = (h: number, a: number): TySoThat[] => [
  { home: "Vietnam", away: "Chinese Taipei", kickoff_utc: "2026-11-11T12:00:00Z", home_score: h, away_score: a },
];

describe("dungMuc — chấm trận đã đá (tệp thật: đoán 2-1)", () => {
  it("thật 2-1 → đúng kết quả + trúng tỷ số", () => {
    const m = dungMuc(BAI, that(2, 1), SAU_TRAN);
    expect([m.ketQua?.dungKetQua, m.ketQua?.dungTySo]).toEqual([true, true]);
  });
  it("thật 3-0 → đúng kết quả, trượt tỷ số", () => {
    const m = dungMuc(BAI, that(3, 0), SAU_TRAN);
    expect([m.ketQua?.dungKetQua, m.ketQua?.dungTySo]).toEqual([true, false]);
  });
  it("thật 1-1 → sai", () => {
    expect(dungMuc(BAI, that(1, 1), SAU_TRAN).ketQua?.dungKetQua).toBe(false);
  });
  it("trước giờ đá thì chưa chấm dù bảng có số", () => {
    const m = dungMuc(BAI, that(2, 1), Date.parse("2026-11-11T11:00:00Z"));
    expect([m.sapDa, m.ketQua]).toEqual([true, null]);
  });
  it("đá xong mà chưa có tỷ số → ketQua null (chờ, không chấm bừa)", () => {
    expect(dungMuc(BAI, [], SAU_TRAN).ketQua).toBeNull();
  });
});

const HANG: HangDuDoan = {
  slug: VN, giai: "Giao hữu", kickoffUtc: "2026-11-11T12:00:00Z", ngay: "2026-11-11", gio: "19:00",
  nha: "Việt Nam", khach: "Đài Bắc Trung Hoa", logoNha: null, logoKhach: null, anhNha: null, anhKhach: null,
  creditAnh: null, du: [2, 1], that: null, dung: null, dungTySo: null, san: "Sân Thiên Trường, Ninh Bình",
  sapDa: true, pick: false, mot: null, formNha: null, formKhach: null,
};

describe("suKienTran — JSON-LD SportsEvent", () => {
  const ev = suKienTran(HANG, "https://www.banhbong.net");
  it("đủ trường: tên, giờ, hai đội, sân, url", () => {
    expect(ev).toMatchObject({
      "@type": "SportsEvent",
      name: "Việt Nam vs Đài Bắc Trung Hoa",
      startDate: "2026-11-11T12:00:00Z",
      eventStatus: "https://schema.org/EventScheduled",
      homeTeam: { "@type": "SportsTeam", name: "Việt Nam" },
      awayTeam: { "@type": "SportsTeam", name: "Đài Bắc Trung Hoa" },
      location: { "@type": "Place", name: "Sân Thiên Trường, Ninh Bình" },
      url: `https://www.banhbong.net/analysis/${VN}`,
    });
  });
  it("trận đã đá ghi kết quả vào description", () => {
    expect(suKienTran({ ...HANG, sapDa: false, that: [3, 0] }, "x").description).toBe(
      "Dự đoán: Việt Nam thắng 2-1. Kết quả: Việt Nam 3-0 Đài Bắc Trung Hoa",
    );
  });
  it("không có sân thì không khai location", () => {
    expect("location" in suKienTran({ ...HANG, san: null }, "x")).toBe(false);
  });
  it("jsonLd thoát dấu < để không đóng thẻ script", () => {
    expect(jsonLd({ a: "</script>" })).not.toContain("</");
  });
  it("câu dự đoán hoà", () => {
    expect(cauDuDoan({ ...HANG, du: [1, 1] })).toBe("Hòa 1-1");
  });
});

describe("cauHoiDuDoan — FAQ chỉ có số thật", () => {
  it("chưa có trận chốt tỷ số → rỗng", () => {
    expect(cauHoiDuDoan([], [])).toEqual([]);
  });
  it("trước giờ đá: đếm 1 trận, 0 đã chấm, không có câu tỉ lệ đúng", () => {
    const m = dungMuc(BAI, [], Date.parse("2026-11-11T11:00:00Z"));
    const ds = cauHoiDuDoan([m], [HANG]);
    expect(ds[0].dap).toBe("1 trận có tỷ số chốt trước giờ bóng lăn: 0 trận đã chấm, 1 trận sắp đá.");
    expect(ds.some((c) => c.hoi.startsWith("Dự đoán đúng"))).toBe(false);
    expect(ds.find((c) => c.hoi.startsWith("Trận sắp tới"))?.dap).toContain("Việt Nam thắng 2-1");
  });
  it("sau trận: thành tích theo tác giả", () => {
    const m = dungMuc(BAI, that(2, 1), SAU_TRAN);
    const ds = cauHoiDuDoan([m], [{ ...HANG, sapDa: false }]);
    expect(ds.find((c) => c.hoi.startsWith("Dự đoán đúng"))?.dap).toBe(
      "Chú Tám: 1/1 trận đúng kết quả (100%), 1/1 trận đúng tỷ số.",
    );
    expect(faqSchema(ds).mainEntity).toHaveLength(ds.length);
  });
});

describe("metaDuDoan — có ngày giờ VN, đúng độ dài", () => {
  // 17:30 UTC 10/11 = 00:30 11/11 giờ VN → phải ra ngày 11/11.
  const m = metaDuDoan(Date.parse("2026-11-10T17:30:00Z"));
  it("ngày theo giờ VN", () => {
    expect(m.tieuDe).toBe("Dự đoán bóng đá hôm nay 11/11/2026");
  });
  it("title + ' | banhbong.net' ≤ 60, description ≤ 160", () => {
    expect(`${m.tieuDe} | banhbong.net`.length).toBeLessThanOrEqual(60);
    expect(m.moTa.length).toBeLessThanOrEqual(160);
  });
});
