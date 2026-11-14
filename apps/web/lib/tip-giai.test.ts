import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { duongTipGiai, giaiCoTip, tipGiai } from "./tip-giai";

const tran = (slug: string, o: Partial<HangDuDoan> = {}) =>
  ({ slug, giai: "La Liga", ngay: "2026-11-15", kickoffUtc: "2026-11-15T12:00:00Z", nha: "B", khach: "C", du: null, taiXiu: null, haiDoiGhi: null, ...o }) as HangDuDoan;
const khong = () => null;
const LL = { khop: /^(spain )?la ?liga$/i };

describe("tipGiai", () => {
  it("chỉ lấy trận của giải, gom theo ngày, bỏ ngày trống", () => {
    const hang = [
      tran("a", { taiXiu: "Tài 2.5" }),
      tran("b", { taiXiu: "Xỉu 2.5", ngay: "2026-11-17", kickoffUtc: "2026-11-17T12:00:00Z" }),
      tran("c", { taiXiu: "Tài 2.5", giai: "Serie A" }),
    ];
    const r = tipGiai(hang, LL, "tai-xiu", "2026-11-14", khong);
    expect(r.map((x) => [x.ngay, x.ds.map((d) => d.h.slug)])).toEqual([["2026-11-15", ["a"]], ["2026-11-17", ["b"]]]);
  });
  it("quá 7 ngày hoặc trước hôm nay thì bỏ", () => {
    const hang = [tran("a", { taiXiu: "Tài 2.5", ngay: "2026-11-21" }), tran("b", { taiXiu: "Tài 2.5", ngay: "2026-11-13" })];
    expect(tipGiai(hang, LL, "tai-xiu", "2026-11-14", khong)).toEqual([]);
    expect(tipGiai(hang, LL, "tai-xiu", "2026-11-15", khong).length).toBe(1);
  });
  it("trận không có tip loại này thì không tính", () => {
    expect(tipGiai([tran("a")], LL, "ty-so", "2026-11-14", khong)).toEqual([]);
  });
});

describe("giaiCoTip", () => {
  it("chỉ trả giải + loại có trận", () => {
    const hang = [tran("a", { taiXiu: "Tài 2.5", haiDoiGhi: true })];
    expect(giaiCoTip(hang, "2026-11-14", khong).map((x) => [x.giai.slug, x.loai, x.soTran])).toEqual([["la-liga", "tai-xiu", 1], ["la-liga", "hai-doi-ghi-ban", 1]]);
  });
});

describe("duongTipGiai", () => {
  it("ghép gốc + slug giải", () => {
    expect(duongTipGiai("hai-doi-ghi-ban", { slug: "serie-a" })).toBe("/ca-2-doi-ghi-ban/serie-a");
  });
});
