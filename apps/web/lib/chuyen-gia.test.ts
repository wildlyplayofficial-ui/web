import { describe, expect, it } from "vitest";
import { chuyenGiaCua, nguoiChuyenGia, PETE_TAC_GIA, ganChuyenGia } from "./chuyen-gia";

describe("chuyenGiaCua", () => {
  it("mọi trận, mọi giải đều ký Pete Nguyễn", () => {
    const ds = [{ giai: "Ngoại hạng Anh", nha: "A", khach: "B" }, { giai: "Giao hữu", nha: "Việt Nam", khach: "Kyrgyzstan" }];
    expect(ds.map((h) => chuyenGiaCua(h).ten)).toEqual(["Pete Nguyễn", "Pete Nguyễn"]);
  });
  it("Person JSON-LD có @id là trang /tac-gia/pete-nguyen", () => {
    expect(nguoiChuyenGia(PETE_TAC_GIA, "https://x.vn")["@id"]).toBe("https://x.vn/tac-gia/pete-nguyen");
  });
});

describe("ganChuyenGia", () => {
  it("bài Chú Tám Banh ký Pete Nguyễn, đổi cả chữ trong thân bài", () => {
    const a = ganChuyenGia({ byline: "Chú Tám Banh", body: "Chú Tám vẫn nghiêng về chủ nhà." });
    expect([a.byline, a.body]).toEqual(["Pete Nguyễn", "Pete Nguyễn vẫn nghiêng về chủ nhà."]);
  });
  it("bài ký tên desk cũ ký Pete Nguyễn", () => {
    expect(["Banh Bóng Desk", "Banh Bóng News"].map((byline) => ganChuyenGia({ byline }).byline)).toEqual(["Pete Nguyễn", "Pete Nguyễn"]);
  });
  it("bài của tác giả khác giữ nguyên", () => {
    expect(ganChuyenGia({ byline: "Trợ lý AI" }).byline).toBe("Trợ lý AI");
  });
});
