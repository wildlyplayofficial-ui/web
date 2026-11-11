import { describe, expect, it, vi } from "vitest";

// Vitest ở đây không có alias "@/": tệp tuần thật không cần; next/cache và CSDL không chạy trong test.
vi.mock("@/data/du-doan-tuan.json", () => ({ default: [] }));
vi.mock("next/cache", () => ({ unstable_cache: (f: unknown) => f }));
vi.mock("./ls-fetch", () => ({ lsFetch: vi.fn() }));
import { slugTuan, type DongTuan } from "./du-doan-tuan";
import { soTen, tySoTuLS, type TranLS } from "./ket-qua";
import { docTySo, doiTran } from "./ket-qua-ls";

const dong = (x: Partial<DongTuan>): DongTuan =>
  ({ ngay: "2026-11-10", giai: "England National League South", nha: "Hemel Hempstead", khach: "Torquay", du: "Away 0-2", fn: "", fk: "", o: [], gioUtc: "2026-11-10T19:45:00Z", ...x }) as DongTuan;
const ls = (x: Partial<TranLS>): TranLS => ({ home: "Hemel Hempstead", away: "Torquay United", kickoff: "2026-11-10T19:45:00Z", kq: [0, 2], ...x });

describe("docTySo", () => {
  it("đọc tỷ số kiểu nhà cung cấp", () => {
    expect(docTySo("2 - 1")).toEqual([2, 1]);
  });

  it("chữ lạ thì null", () => {
    expect(docTySo("? - ?")).toBeNull();
  });
});

describe("doiTran", () => {
  it("bỏ trận chưa kết thúc", () => {
    expect(doiTran({ date: "2026-11-10", status: "IN PLAY", home: { name: "A" }, away: { name: "B" }, scores: { ft_score: "1 - 0" } })).toBeNull();
  });

  it("trận kết thúc ra giờ đá UTC + tỷ số", () => {
    expect(
      doiTran({ date: "2026-11-10", scheduled: "19:45", status: "FINISHED", home: { name: "A" }, away: { name: "B" }, scores: { ft_score: "1 - 3" } }),
    ).toEqual({ home: "A", away: "B", kickoff: "2026-11-10T19:45:00Z", kq: [1, 3] });
  });
});

describe("soTen", () => {
  it("bỏ FC/United để tên PredictZ và nhà cung cấp gần nhau", () => {
    expect(soTen("Marine FC")).toBe(soTen("Marine"));
  });
});

describe("tySoTuLS", () => {
  it("khớp tên rút gọn (Torquay ↔ Torquay United)", () => {
    const d = dong({});
    expect(tySoTuLS([d], [ls({})]).get(slugTuan(d))).toEqual([0, 2]);
  });

  it("khớp tên chứa nhau (UD Logrones ↔ Logrones)", () => {
    const d = dong({ nha: "Amorebieta", khach: "UD Logrones", gioUtc: "2026-11-10T19:00:00Z" });
    expect(tySoTuLS([d], [ls({ home: "Amorebieta", away: "Logrones", kickoff: "2026-11-10T19:00:00Z", kq: [1, 0] })]).get(slugTuan(d))).toEqual([1, 0]);
  });

  it("không khớp khi giờ đá lệch quá 36 tiếng", () => {
    expect(tySoTuLS([dong({})], [ls({ kickoff: "2026-11-13T19:45:00Z" })]).size).toBe(0);
  });

  it("dòng không có giờ: lấy trưa ngày PredictZ, trận tối cùng ngày vẫn khớp", () => {
    const d = dong({ gioUtc: null });
    expect(tySoTuLS([d], [ls({})]).get(slugTuan(d))).toEqual([0, 2]);
  });

  it("đảo sân nhà/khách thì không khớp", () => {
    expect(tySoTuLS([dong({})], [ls({ home: "Torquay United", away: "Hemel Hempstead" })]).size).toBe(0);
  });
});
