// Bài nhận định sinh từ số + ngưỡng index của trang trận tệp tuần.
import { describe, expect, it } from "vitest";
import { nhanDinhTran, tomTatDuDoan, type DauVaoNhanDinh } from "./tran-nhan-dinh";
import { duDuLieuIndex, soDoi, xacSuat1X2 } from "./tran-nhan-dinh-so";
import type { TranGanDay } from "./tran-so-lieu";

const tran = (i: number, doi: string, ghi: number, thung: number): TranGanDay =>
  i % 2 === 0
    ? { ngay: `2026-11-${String(10 - i).padStart(2, "0")}`, nha: doi, khach: `Doi ${i}`, tsn: ghi, tsk: thung }
    : { ngay: `2026-11-${String(10 - i).padStart(2, "0")}`, nha: `Doi ${i}`, khach: doi, tsn: thung, tsk: ghi };
const GN = [0, 1, 2, 3, 4, 5].map((i) => tran(i, "Alpha FC", 2, 0));
const GK = [0, 1, 2, 3, 4, 5].map((i) => tran(i, "Beta", 0, 1));
const H2H = ["2025/26", "2024/25", "2023/24"].map((mua) => ({ mua, nha: "Alpha FC", khach: "Beta", tsn: 1, tsk: 1 }));
const DONG = { ngay: "2026-11-15", nha: "Alpha FC", khach: "Beta", du: "Home 2-0" };

const VAO: DauVaoNhanDinh = {
  slug: "tuan-2026-11-15-alpha-beta", nha: "Alpha", khach: "Beta", nhaGoc: "Alpha FC", khachGoc: "Beta",
  du: [2, 0], mot: [1.5, 4, 6], taiXiu: "Under 2.5", haiDoiGhi: false, so: { gn: GN, gk: GK, h2h: H2H },
  pOu: { tip: "Under 2.5", keo: [2.1, 1.7], h5: [], a5: [] },
};

describe("ngưỡng index trang trận tệp tuần", () => {
  it("đủ phong độ hai đội thì qua ngưỡng", () => {
    expect(duDuLieuIndex({ ...DONG, gn: GN, gk: GK })).toBe(true);
  });
  it("thiếu phong độ nhưng đủ 3 lần đối đầu thì qua ngưỡng", () => {
    expect(duDuLieuIndex({ ...DONG, h2h: H2H })).toBe(true);
  });
  it("không có số liệu nào thì dưới ngưỡng", () => {
    expect(duDuLieuIndex(DONG)).toBe(false);
  });
  it("không có tỷ số dự đoán thì dưới ngưỡng dù đủ số liệu", () => {
    expect(duDuLieuIndex({ ...DONG, du: "", gn: GN, gk: GK, h2h: H2H })).toBe(false);
  });
});

describe("số liệu đội", () => {
  it("cộng điểm từ các trận gần đây", () => {
    expect(soDoi(GN, "Alpha FC", "nha")?.diem).toBe(18);
  });
  it("dưới 5 trận thì không có số", () => {
    expect(soDoi(GN.slice(0, 4), "Alpha FC", "nha")).toBeNull();
  });
  it("quy tỷ lệ 1·X·2 ra phần trăm cộng lại gần 100", () => {
    expect(xacSuat1X2([2, 4, 4])).toEqual([50, 25, 25]);
  });
});

describe("bài nhận định sinh từ số", () => {
  const bai = nhanDinhTran(VAO, (x) => x);
  it("có đoạn phong độ từng đội, đối đầu, bàn thắng và chốt", () => {
    expect(bai.map((m) => m.tieuDe)).toEqual([
      "Phong độ Alpha", "Phong độ Beta", "Lịch sử đối đầu Alpha vs Beta",
      "Over/Under và khả năng hai đội cùng ghi bàn", "Dự đoán tỷ số Alpha vs Beta",
    ]);
  });
  it("không dùng chữ bị cấm", () => {
    expect(bai.map((m) => m.doan).join(" ")).not.toMatch(/tài xỉu|Trả lời nhanh|Trả lời thẳng/i);
  });
  it("thiếu hết số liệu thì chỉ còn đoạn chốt", () => {
    expect(nhanDinhTran({ ...VAO, so: null }, (x) => x).map((m) => m.tieuDe)).toEqual(["Dự đoán tỷ số Alpha vs Beta"]);
  });
  it("bảng tóm tắt lấy tỷ lệ đúng cửa đã chọn", () => {
    expect(tomTatDuDoan(VAO).map((d) => d.tyLe)).toEqual([1.5, null, 1.7, null]);
  });
});
