import { describe, expect, it } from "vitest";
import { hubGiai, ketQuaDuocIndex, linkHighlight, slugLuuTru, timLuuTru, type TranLuuTru } from "./du-doan-luu-tru";

const PALACE: TranLuuTru = {
  ngay: "2026-11-08",
  gioUtc: "2026-11-08T14:00:00Z",
  giai: "England Premier League",
  nha: "Crystal Palace",
  khach: "Liverpool",
  kq: [1, 3],
};
const HL = { url: "https://www.youtube.com/watch?v=8Kl329FHOT8", nguon: "Premier League" };

describe("kho trận đã đá", () => {
  it("slug cùng khuôn trang tuần", () => {
    expect(slugLuuTru(PALACE)).toMatch(/^tuan-2026-11-08-/);
  });

  it("timLuuTru tìm đúng theo slug, slug lạ → null", () => {
    expect(timLuuTru(slugLuuTru(PALACE), [PALACE])).toBe(PALACE);
    expect(timLuuTru("tuan-2026-11-08-a-b", [PALACE])).toBeNull();
  });

  it("highlight chỉ nhận YouTube", () => {
    expect(linkHighlight(HL)).toEqual(HL);
    expect(linkHighlight({ url: "https://youtu.be/8Kl329FHOT8", nguon: "x" })).not.toBeNull();
    expect(linkHighlight({ url: "https://xoilac.example/tran", nguon: "x" })).toBeNull();
    expect(linkHighlight({ url: "khong-phai-url", nguon: "x" })).toBeNull();
    expect(linkHighlight(undefined)).toBeNull();
  });

  it("chỉ có tỷ số → noindex; có highlight hoặc số liệu → index", () => {
    expect(ketQuaDuocIndex(PALACE)).toBe(false);
    expect(ketQuaDuocIndex({ ...PALACE, hl: HL })).toBe(true);
    expect(ketQuaDuocIndex({ ...PALACE, so: { xg: [1.2, 2.1] } })).toBe(true);
  });

  it("giải ngoài danh sách → noindex dù có highlight", () => {
    expect(ketQuaDuocIndex({ ...PALACE, giai: "England League Two", hl: HL })).toBe(false);
  });

  it("hub giải theo tên gốc", () => {
    expect(hubGiai("UEFA Champions League")).toBe("champions-league");
    expect(hubGiai("England League Two")).toBeNull();
  });
});
