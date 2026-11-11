import { describe, expect, it } from "vitest";
import { chuyenGiaCua, nguoiChuyenGia, CHUYEN_GIA, ganChuyenGia } from "./chuyen-gia";

const ai = (giai: string, nha = "A", khach = "B") => chuyenGiaCua({ giai, nha, khach }).ten;

describe("chuyenGiaCua", () => {
  it("Ngoại hạng Anh và FA Cup về Lê Hoàng Bách", () => {
    expect([ai("Ngoại hạng Anh"), ai("Premier League"), ai("FA Cup")]).toEqual(Array(3).fill("Lê Hoàng Bách"));
  });
  it("La Liga và Serie A Ý về Trần Minh Triết", () => {
    expect([ai("La Liga"), ai("Serie A")]).toEqual(["Trần Minh Triết", "Trần Minh Triết"]);
  });
  it("Bundesliga, Ligue 1, cúp châu Âu về Vũ Đức Khải", () => {
    expect([ai("Bundesliga"), ai("Ligue 1"), ai("UEFA Champions League"), ai("UEFA Europa League")]).toEqual(Array(4).fill("Vũ Đức Khải"));
  });
  it("trận có tuyển Việt Nam về Đặng Quang Vinh dù giải nào", () => {
    expect(ai("Giải gì đó", "Việt Nam", "Đài Bắc Trung Hoa")).toBe("Đặng Quang Vinh");
  });
  it("V-League, giao hữu, Nations League về Đặng Quang Vinh", () => {
    expect([ai("V-League 1"), ai("Giao hữu quốc tế"), ai("Nations League")]).toEqual(Array(3).fill("Đặng Quang Vinh"));
  });
  it("giải trùng tên một phần không bị bắt nhầm (VĐQG Brazil, Serie C Ý, VĐQG Algeria)", () => {
    expect([ai("VĐQG Brazil"), ai("Serie C Ý"), ai("VĐQG Algeria"), ai("VĐQG Bắc Ireland")]).toEqual(Array(4).fill("Phạm Tuấn Kiệt"));
  });
  it("giải còn lại về Phạm Tuấn Kiệt", () => {
    expect([ai("Hạng 6 Anh miền Bắc"), ai("Cúp Nhà vua Tây Ban Nha")]).toEqual(["Phạm Tuấn Kiệt", "Phạm Tuấn Kiệt"]);
  });
  it("Person JSON-LD trỏ về neo của chuyên gia trên /about", () => {
    expect(nguoiChuyenGia(CHUYEN_GIA[2], "https://x.vn").url).toBe("https://x.vn/about#vu-duc-khai");
  });
});

describe("ganChuyenGia", () => {
  it("bài Chú Tám Banh trận Việt Nam ký Đặng Quang Vinh, đổi cả chữ trong thân bài", () => {
    const a = ganChuyenGia({ byline: "Chú Tám Banh", league: "Giao hữu quốc tế", body: "Chú Tám vẫn nghiêng về chủ nhà.", du_doan: { home: "Việt Nam", away: "Đài Bắc Trung Hoa" } });
    expect([a.byline, a.body]).toEqual(["Đặng Quang Vinh", "Đặng Quang Vinh vẫn nghiêng về chủ nhà."]);
  });

  it("bài của tác giả khác giữ nguyên", () => {
    expect(ganChuyenGia({ byline: "Pete Nguyễn", league: "Premier League" }).byline).toBe("Pete Nguyễn");
  });
});
