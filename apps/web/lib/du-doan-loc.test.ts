import { describe, expect, it } from "vitest";
import { duongDanNgay, GIAI_TRANG, giaiTuSlug, ngayTuSlug, tenNgay, tomTatGiai, tranCuaGiai } from "./du-doan-loc";
import type { HangDuDoan } from "./du-doan-hang";

// 11/11/2026 là Thứ Tư.
const HOM_NAY = "2026-11-11";

describe("duongDanNgay", () => {
  it("hôm nay là trang /du-doan", () => expect(duongDanNgay("2026-11-11", HOM_NAY)).toBe("/du-doan"));
  it("ngày mai là /du-doan/ngay-mai", () => expect(duongDanNgay("2026-11-12", HOM_NAY)).toBe("/du-doan/ngay-mai"));
  it("thứ Bảy 14/11 là /du-doan/thu-bay", () => expect(duongDanNgay("2026-11-14", HOM_NAY)).toBe("/du-doan/thu-bay"));
  it("Chủ Nhật 15/11 là /du-doan/chu-nhat", () => expect(duongDanNgay("2026-11-15", HOM_NAY)).toBe("/du-doan/chu-nhat"));
});

describe("ngayTuSlug", () => {
  it("ngay-mai ra 12/11", () => expect(ngayTuSlug("ngay-mai", HOM_NAY)).toBe("2026-11-12"));
  it("thu-bay ra thứ Bảy gần nhất 14/11", () => expect(ngayTuSlug("thu-bay", HOM_NAY)).toBe("2026-11-14"));
  it("thu-tu (cùng thứ hôm nay) ra tuần sau 18/11", () => expect(ngayTuSlug("thu-tu", HOM_NAY)).toBe("2026-11-18"));
  it("slug trận không phải slug ngày", () => expect(ngayTuSlug("tuan-2026-11-10-a-b", HOM_NAY)).toBeNull());
  it("đi vòng: link của mọi ngày trong 6 ngày tới mở lại đúng ngày đó", () => {
    for (const k of ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]) {
      expect(ngayTuSlug(duongDanNgay(k, HOM_NAY).replace("/du-doan/", ""), HOM_NAY)).toBe(k);
    }
  });
});

describe("tenNgay", () => {
  it("mai ghi 'ngày mai'", () => expect(tenNgay("2026-11-12", HOM_NAY)).toBe("ngày mai 12/11"));
  it("ngày khác ghi thứ", () => expect(tenNgay("2026-11-14", HOM_NAY)).toBe("Thứ Bảy 14/11"));
});

describe("giải có trang riêng", () => {
  it("slug giải không trùng slug ngày", () => {
    for (const g of GIAI_TRANG) expect(ngayTuSlug(g.slug, HOM_NAY)).toBeNull();
  });
  it("Ngoại hạng Anh không nhận VĐQG Bắc Ireland hay Uganda", () => {
    const g = giaiTuSlug("ngoai-hang-anh")!;
    expect(["Ngoại hạng Anh", "Premier League"].every((x) => g.khop.test(x))).toBe(true);
    expect(["VĐQG Bắc Ireland", "Northern Ireland Premier League", "VĐQG Uganda"].some((x) => g.khop.test(x))).toBe(false);
  });
  it("Serie A không nhận VĐQG Brazil hay Serie C Ý", () => {
    const g = giaiTuSlug("serie-a")!;
    expect(["VĐQG Brazil", "Brazil Serie A", "Serie C Ý"].some((x) => g.khop.test(x))).toBe(false);
  });
  it("tranCuaGiai bỏ trận đã qua, xếp theo giờ đá", () => {
    const h = (slug: string, ngay: string, kickoffUtc: string, giai = "Nations League") => ({ slug, ngay, kickoffUtc, giai }) as HangDuDoan;
    const ds = tranCuaGiai(
      [h("b", "2026-11-14", "2026-11-14T19:45:00Z"), h("cu", "2026-11-10", "2026-11-10T19:45:00Z"), h("a", "2026-11-12", "2026-11-12T19:45:00Z"), h("x", "2026-11-12", "2026-11-12T10:00:00Z", "La Liga")],
      giaiTuSlug("nations-league")!,
      HOM_NAY,
    );
    expect(ds.map((x) => x.slug)).toEqual(["a", "b"]);
  });
});

describe("tomTatGiai", () => {
  const t = (ngay: string, du: [number, number] | null, taiXiu: string | null) => ({ ngay, du, taiXiu }) as HangDuDoan;
  it("không có trận thì không viết gì", () => expect(tomTatGiai([], "La Liga")).toBeNull());
  it("đếm thắng/hoà/thua, bàn trung bình, Over từ đúng số liệu", () => {
    const s = tomTatGiai([t("2026-11-21", [2, 0], "Over 2.5"), t("2026-11-21", [1, 1], "Under 2.5"), t("2026-11-22", [0, 3], "Over 2.5"), t("2026-11-22", null, null)], "La Liga")!;
    expect(s).toContain("4 trận sắp đá trong 2 ngày từ 21/11 đến 22/11");
    expect(s).toContain("1 chủ nhà thắng, 1 hoà, 1 khách thắng");
    expect(s).toContain("trung bình 2,3 bàn");
    expect(s).toContain("2/3 trận được dự đoán Over");
  });
  it("chưa chốt tỷ số trận nào thì chỉ nói lịch", () => {
    expect(tomTatGiai([t("2026-11-21", null, null)], "Serie A")).toContain("1 trận sắp đá trong ngày 21/11");
  });
});
