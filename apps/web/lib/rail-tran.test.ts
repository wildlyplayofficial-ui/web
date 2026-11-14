import { describe, expect, it } from "vitest";
import type { HangDuDoan } from "./du-doan-hang";
import { railTran } from "./rail-tran";

const NOW = Date.parse("2026-11-14T10:00:00Z");
const h = (slug: string, gio: string, o: Partial<HangDuDoan> = {}) =>
  ({ slug, giai: "UEFA Nations League", kickoffUtc: gio, nha: slug + "A", khach: slug + "B", logoNha: "a.png", logoKhach: "b.png", that: null, ...o }) as HangDuDoan;

describe("railTran", () => {
  it("bỏ trận đã qua mà không có tỷ số, trận cách quá xa", () => {
    const r = railTran([h("cu", "2026-11-14T06:00:00Z"), h("xa", "2026-11-25T06:00:00Z"), h("ok", "2026-11-14T12:00:00Z")], NOW);
    expect(r.map((x) => x.id)).toEqual(["ok"]);
  });
  it("giữ kết quả có tỷ số trong 20 giờ, bỏ cũ hơn", () => {
    const r = railTran([h("kq", "2026-11-14T02:00:00Z", { that: [1, 0] }), h("cu", "2026-11-12T02:00:00Z", { that: [1, 0] })], NOW);
    expect(r.map((x) => x.id)).toEqual(["kq"]);
  });
  it("bỏ trận thiếu logo một đội", () => {
    expect(railTran([h("x", "2026-11-14T12:00:00Z", { logoKhach: null })], NOW)).toEqual([]);
  });
  it("lấy tỷ số tra thêm cho trận đã đá", () => {
    const r = railTran([h("t", "2026-11-14T02:00:00Z")], NOW, new Map([["t", [2, 1] as [number, number]]]));
    expect(r[0].that).toEqual([2, 1]);
  });
  it("đánh dấu đang đá và sắp xếp theo giờ", () => {
    const r = railTran([h("b", "2026-11-14T12:00:00Z"), h("a", "2026-11-14T09:00:00Z")], NOW);
    expect(r.map((x) => [x.id, x.dangDa])).toEqual([["a", true], ["b", false]]);
  });
  it("giải lớn đứng trước giải nhỏ khi vượt trần, mỗi giải tối đa 3", () => {
    const nho = Array.from({ length: 6 }, (_, i) => h("n" + i, `2026-11-14T1${i}:00:00Z`, { giai: "Italy Serie C" }));
    const lon = Array.from({ length: 5 }, (_, i) => h("l" + i, `2026-11-15T0${i}:00:00Z`, { giai: "Spain La Liga" }));
    const r = railTran([...nho, ...lon], NOW, new Map(), 5);
    expect(r.filter((x) => x.giai === "Spain La Liga").length).toBe(3);
    expect(r.length).toBe(5);
  });
});
