import { describe, expect, it } from "vitest";
import { BANG_XEP, chuoi, dongForm, ganNhat, tepXgDoi, topBang, xepTheoChenh, type DoiXg, type GiaiXg, type TranDoi } from "./xg-doi";

const t = (bt: number, bb: number, san: "N" | "K" = "N"): TranDoi => ({ ngay: "2026-11-01", dt: "X", san, bt, bb });
const doi = (ten: string, gan: TranDoi[], chenh = 0): DoiXg => ({
  id: ten, ten, logo: "", hang: 1, diem: 0, tran: gan.length, th: 0, h: 0, b: 0,
  xg: 1, xga: 1 - chenh, chenh, bt: 1, bb: 1, sut: 4, ks: 50, gan,
});
const GIAI: GiaiXg = { slug: "x", ten: "X", fmId: 1, tenGoc: null, doi: [] };

describe("xg-doi", () => {
  it("tệp có đủ 5 giải lớn, mỗi giải đủ đội", () => {
    const so = Object.fromEntries(tepXgDoi().giai.map((g) => [g.slug, g.doi.length]));
    expect(so).toMatchObject({ "ngoai-hang-anh": 20, "la-liga": 20, "serie-a": 20, bundesliga: 18, "ligue-1": 18 });
  });

  it("xếp /thong-so theo chênh xG giảm dần", () => {
    expect(xepTheoChenh([doi("A", [], 0.1), doi("B", [], 0.9)]).map((d) => d.ten)).toEqual(["B", "A"]);
  });

  it("5 trận gần nhất lấy ĐUÔI mảng (mới nhất), lọc được theo sân", () => {
    const gan = [t(0, 1), t(1, 0, "K"), t(2, 2), t(3, 0), t(1, 1, "K"), t(4, 0), t(0, 0)];
    expect(ganNhat(gan).map((x) => x.bt)).toEqual([2, 3, 1, 4, 0]);
    expect(ganNhat(gan, 5, "K").map((x) => x.bt)).toEqual([1, 1]);
  });

  it("chuỗi bất bại đếm từ trận mới nhất ngược về", () => {
    expect(chuoi([t(0, 1), t(1, 1), t(2, 0)], (x) => x.bt >= x.bb)).toBe(2);
  });

  it("dòng form: điểm, bàn ghi/thua 5 trận, badge cũ trước mới sau", () => {
    const d = dongForm(doi("A", [t(0, 3), t(2, 0), t(1, 1), t(0, 1), t(3, 1), t(2, 2)]), GIAI);
    expect(d.kq).toEqual(["T", "H", "B", "T", "H"]);
    expect(d.diem).toBe(8);
    expect([d.ghi, d.thua]).toEqual([8, 5]);
  });

  it("bảng 'thủng lưới ít nhất' xếp bàn thua tăng dần, bỏ đội chưa đủ 5 trận", () => {
    const b = BANG_XEP.find((x) => x.id === "thung-luoi-it-nhat")!;
    const ds = [
      dongForm(doi("A", [t(1, 1), t(1, 1), t(1, 1), t(1, 1), t(1, 1)]), GIAI),
      dongForm(doi("B", [t(1, 0), t(1, 0), t(1, 0), t(1, 0), t(1, 0)]), GIAI),
      dongForm(doi("C", [t(1, 0)]), GIAI),
    ];
    expect(topBang(b, ds, 10).map((d) => d.doi.ten)).toEqual(["B", "A"]);
  });
});
