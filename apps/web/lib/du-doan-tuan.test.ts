// Dòng tệp tuần gắn `bai` (trận ĐTQG có bài nhận định): số liệu đổ vào trang bài, không thành trận lẻ.
import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { gopTuan, hangTuan, keoPhuTuan, soLieuTuan } from "./du-doan-tuan";

const BAI = "nhan-dinh-viet-nam-vs-dai-bac-trung-hoa-11-11-2026";
const bai = (): HangDuDoan => ({
  slug: BAI, coBai: true, giai: "Giao hữu", kickoffUtc: "2026-11-11T12:00:00Z", ngay: "2026-11-11", gio: "19:00",
  nha: "Việt Nam", khach: "Đài Bắc Trung Hoa", logoNha: null, logoKhach: null, anhNha: null, anhKhach: null, creditAnh: null,
  du: [2, 1], that: null, dung: null, dungTySo: null, san: null, sapDa: true, pick: false, mot: null,
  formNha: null, formKhach: null, doiDau: null, taiXiu: null, haiDoiGhi: null, nhan: [],
});

describe("dòng tệp tuần gắn bài nhận định", () => {
  it("gopTuan điền tỷ lệ 1·X·2 vào trang bài", () => {
    expect(gopTuan([bai()])[0].mot).toEqual([1.11, 8.5, 17]);
  });

  it("gopTuan điền tài xỉu và hai đội ghi bàn", () => {
    const g = gopTuan([bai()])[0];
    expect([g.taiXiu, g.haiDoiGhi]).toEqual(["Tài 2.5", true]);
  });

  it("số liệu trang bài giữ đủ 10 trận dù đội tuyển nghỉ lâu", () => {
    expect(soLieuTuan(BAI)?.gk?.length).toBe(10);
  });

  it("trang bài có khối tỷ số chính xác", () => {
    expect(keoPhuTuan(BAI)?.pCs?.tip).toBe("Home 2-1");
  });

  it("dòng gắn bài không sinh thêm trận lẻ trên /du-doan", () => {
    expect(hangTuan([], [], Date.parse("2026-11-11T05:00:00Z")).some((h) => h.slug.includes("vietnam"))).toBe(false);
  });
});
