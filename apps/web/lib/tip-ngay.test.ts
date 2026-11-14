import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { demNhom, dongTipNgay } from "./tip-ngay";

const tran = (slug: string, o: Partial<HangDuDoan> = {}) =>
  ({ slug, ngay: "2026-11-14", kickoffUtc: "2026-11-14T12:00:00Z", nha: "B", khach: "C", du: null, taiXiu: null, haiDoiGhi: null, ...o }) as HangDuDoan;
const khong = () => null;

describe("dongTipNgay", () => {
  it("chỉ lấy trận đúng ngày, xếp theo giờ đá", () => {
    const hang = [
      tran("a", { taiXiu: "Over 2.5", kickoffUtc: "2026-11-14T15:00:00Z" }),
      tran("b", { taiXiu: "Under 2.5", kickoffUtc: "2026-11-14T11:00:00Z" }),
      tran("c", { taiXiu: "Over 2.5", ngay: "2026-11-15" }),
    ];
    expect(dongTipNgay(hang, "2026-11-14", "tai-xiu", khong).map((d) => d.h.slug)).toEqual(["b", "a"]);
  });
  it("Over/Under: khối pOu thắng chữ trong dòng, lấy tỷ lệ đúng cửa và chuỗi", () => {
    const [d] = dongTipNgay([tran("a", { taiXiu: "Under 2.5" })], "2026-11-14", "tai-xiu", () => ({ pOu: { tip: "Over 2.5", keo: [1.6, 2.2], h5: "OOUUO", a5: "UUUUU" } }));
    expect([d.nhom, d.keo, d.chuoiNha, d.chuoiKhach?.some(Boolean)]).toEqual(["Over 2.5", 1.6, [true, true, false, false, true], false]);
  });
  it("Over/Under: trận không có tip bị bỏ", () => {
    expect(dongTipNgay([tran("a")], "2026-11-14", "tai-xiu", khong)).toEqual([]);
  });
  it("hai đội ghi bàn: có/không, tỷ lệ cửa Không là số thứ hai", () => {
    const [d] = dongTipNgay([tran("a", { haiDoiGhi: true })], "2026-11-14", "hai-doi-ghi-ban", () => ({ pBtts: { tip: "BTTS No", keo: [1.8, 1.91] } }));
    expect([d.nhom, d.keo]).toEqual(["Không", 1.91]);
  });
  it("hai đội ghi bàn: tip = false vẫn là một dòng (không nhầm với thiếu)", () => {
    expect(dongTipNgay([tran("a", { haiDoiGhi: false })], "2026-11-14", "hai-doi-ghi-ban", khong)[0].nhom).toBe("Không");
  });
  it("tỷ số: lấy từ pCs, thiếu thì lấy tỷ số dự đoán của dòng, tỷ lệ 0 = không có", () => {
    const hang = [tran("a", { du: [1, 1] }), tran("b", { du: [3, 0] })];
    const ds = dongTipNgay(hang, "2026-11-14", "ty-so", (s) => (s === "b" ? { pCs: { tip: "Home 2-0", keo: [9] } } : { pCs: { tip: "Draw 1-1", keo: [0] } }));
    expect(ds.map((d) => [d.nhom, d.keo])).toEqual([["1-1", null], ["2-0", 9]]);
  });
});

describe("demNhom", () => {
  it("đếm theo nhãn, nhiều nhất trước", () => {
    const hang = ["1-0", "2-1", "1-0"].map((x, i) => tran(`t${i}`, { du: [Number(x[0]), Number(x[2])] }));
    expect(demNhom(dongTipNgay(hang, "2026-11-14", "ty-so", khong))).toEqual([{ nhom: "1-0", so: 2 }, { nhom: "2-1", so: 1 }]);
  });
});
