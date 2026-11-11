import { describe, expect, it, vi } from "vitest";

// Vitest ở đây không có alias "@/": tệp tuần thật không cần cho các ca dưới.
vi.mock("@/data/du-doan-tuan.json", () => ({ default: [] }));
import type { HangDuDoan } from "./du-doan-hang";
import { slugTuan, type DongTuan } from "./du-doan-tuan";
import { cacNgay, canTraTySo, gomGiai, ketQuaNgay, nhanNgay, tieuDeNgay, tySoTuFixtures } from "./ket-qua";

const hang = (x: Partial<HangDuDoan>): HangDuDoan =>
  ({
    slug: `s-${x.nha ?? "A"}`,
    giai: "Cúp Nhà vua Tây Ban Nha",
    kickoffUtc: "2026-11-10T12:00:00Z",
    ngay: "2026-11-10",
    gio: "19:00",
    nha: "A",
    khach: "B",
    logoNha: null,
    logoKhach: null,
    that: null,
    ...x,
  }) as HangDuDoan;

const dong = (x: Partial<DongTuan>): DongTuan =>
  ({ ngay: "2026-11-10", giai: "Spain Copa Del Rey", nha: "Pamplona", khach: "Eibar", du: "Home 2-1", fn: "", fk: "", o: [], gioUtc: null, ...x }) as DongTuan;

describe("ketQuaNgay", () => {
  it("lấy dòng có tỷ số thật, bỏ dòng chưa có", () => {
    const ds = ketQuaNgay([hang({ that: [2, 1] }), hang({ nha: "C" })], "2026-11-10");
    expect(ds.map((t) => t.kq)).toEqual([[2, 1]]);
  });

  it("dòng chưa có `that` thì lấy tỷ số tra từ bảng fixtures theo slug", () => {
    const ds = ketQuaNgay([hang({ nha: "C" })], "2026-11-10", new Map([["s-C", [0, 3]]]));
    expect(ds.map((t) => t.kq)).toEqual([[0, 3]]);
  });

  it("chỉ lấy trận đúng ngày giờ VN, xếp theo giờ đá", () => {
    const ds = ketQuaNgay(
      [
        hang({ nha: "X", that: [1, 0], kickoffUtc: "2026-11-10T12:00:00Z", gio: "19:00" }),
        hang({ nha: "Y", that: [1, 0], kickoffUtc: "2026-11-10T05:00:00Z", gio: "12:00" }),
        hang({ nha: "Z", that: [1, 0], ngay: "2026-11-11" }),
      ],
      "2026-11-10",
    );
    expect(ds.map((t) => t.gio)).toEqual(["12:00", "19:00"]);
  });
});

describe("tỷ số từ bảng fixtures", () => {
  const daDa = [{ home: "Pamplona", away: "Eibar", kickoff_utc: "2026-11-10T18:00:00Z", home_score: 1, away_score: 2 }];

  it("khớp tên gốc + giờ đá lệch trong 36 giờ", () => {
    const d = dong({ gioUtc: "2026-11-10T18:00:00Z" });
    expect(tySoTuFixtures([d], daDa).get(slugTuan(d))).toEqual([1, 2]);
  });

  it("ngược sân nhà thì không khớp", () => {
    const d = dong({ nha: "Eibar", khach: "Pamplona" });
    expect(tySoTuFixtures([d], daDa).size).toBe(0);
  });

  it("chỉ tra dòng đã tới giờ đá mà chưa có kq", () => {
    const ds = canTraTySo(
      [dong({ gioUtc: "2026-11-10T18:00:00Z" }), dong({ gioUtc: "2026-11-10T18:00:00Z", kq: [0, 0] }), dong({ gioUtc: "2026-11-12T18:00:00Z" })],
      Date.parse("2026-11-11T05:00:00Z"),
    );
    expect(ds).toHaveLength(1);
  });
});

describe("gomGiai", () => {
  it("giải nhiều trận đứng trước", () => {
    const ds = ketQuaNgay(
      [hang({ giai: "G1", that: [1, 0] }), hang({ giai: "G2", nha: "C", that: [1, 0] }), hang({ giai: "G2", nha: "D", that: [0, 0] })],
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
