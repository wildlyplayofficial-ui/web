import { describe, expect, it, vi } from "vitest";

// Vitest ở đây không có alias "@/": tệp tuần thật không cần cho các ca dưới.
vi.mock("@/data/du-doan-tuan.json", () => ({ default: [] }));
import type { DongTuan } from "./du-doan-tuan";
import { cacNgay, gomGiai, ketQuaNgay, nhanNgay, tieuDeNgay } from "./ket-qua";

const dong = (x: Partial<DongTuan>): DongTuan =>
  ({ ngay: "2026-11-10", giai: "Copa del Rey", nha: "A", khach: "B", du: "Home 2-1", fn: "", fk: "", o: [], gioUtc: null, ...x }) as DongTuan;

describe("ketQuaNgay", () => {
  it("chỉ lấy trận đã có tỷ số", () => {
    const ds = ketQuaNgay([dong({ kq: [2, 1] }), dong({ nha: "C" })], "2026-11-10");
    expect(ds.map((t) => t.kq)).toEqual([[2, 1]]);
  });

  it("trận 20:00 UTC ngày 10 tính vào ngày 11 giờ VN", () => {
    const d = dong({ kq: [0, 0], gioUtc: "2026-11-10T20:00:00Z" });
    expect(ketQuaNgay([d], "2026-11-11")).toHaveLength(1);
    expect(ketQuaNgay([d], "2026-11-10")).toHaveLength(0);
  });

  it("xếp theo giờ đá và ra giờ VN", () => {
    const ds = ketQuaNgay(
      [dong({ nha: "X", kq: [1, 0], gioUtc: "2026-11-10T12:00:00Z" }), dong({ nha: "Y", kq: [1, 0], gioUtc: "2026-11-10T05:00:00Z" })],
      "2026-11-10",
    );
    expect(ds.map((t) => t.gio)).toEqual(["12:00", "19:00"]);
  });
});

describe("gomGiai", () => {
  it("giải nhiều trận đứng trước", () => {
    const ds = ketQuaNgay(
      [dong({ giai: "G1", kq: [1, 0] }), dong({ giai: "G2", nha: "C", kq: [1, 0] }), dong({ giai: "G2", nha: "D", kq: [0, 0] })],
      "2026-11-10",
    );
    expect(gomGiai(ds).map(([g, x]) => [g, x.length])).toEqual([["G2", 2], ["G1", 1]]);
  });
});

describe("nhãn ngày", () => {
  it("hôm nay, hôm qua, rồi tên thứ", () => {
    expect(cacNgay("2026-11-11").map((k) => nhanNgay(k, "2026-11-11"))).toEqual([
      "Hôm nay 11/11",
      "Hôm qua 10/11",
      "Thứ Hai 9/11",
      "Chủ Nhật 8/11",
      "Thứ Bảy 7/11",
    ]);
  });

  it("tiêu đề mặc định là hôm qua", () => {
    expect(tieuDeNgay("2026-11-10", "2026-11-11")).toBe("Kết quả bóng đá hôm qua");
  });
});
