// Chạy: vitest run (web chưa cài vitest — mượn bản của apps/worker, xem du-doan.test.ts).
import { describe, expect, it } from "vitest";
import { chamDong, gopSo, theoNgay, tongThanhTich, type DongCham } from "./thanh-tich";

const d = (o: Partial<DongCham>): DongCham => ({ ngay: "2026-11-10", giai: "G", nha: "A", khach: "B", du: "Home 2-1", ...o });

describe("chamDong", () => {
  it("đúng chiều thắng nhưng sai tỷ số", () => {
    const c = chamDong(d({ kq: [3, 0] }));
    expect([c?.dung, c?.dungTySo]).toEqual([true, false]);
  });
  it("đúng tỷ số", () => {
    expect(chamDong(d({ kq: [2, 1] }))?.dungTySo).toBe(true);
  });
  it("đoán hoà, đá thắng → sai", () => {
    expect(chamDong(d({ du: "Draw 1-1", kq: [1, 0] }))?.dung).toBe(false);
  });
  it("tài 2.5 cần từ 3 bàn", () => {
    expect([chamDong(d({ tx: "Tài 2.5", kq: [2, 0] }))?.dungTx, chamDong(d({ tx: "Tài 2.5", kq: [2, 1] }))?.dungTx]).toEqual([false, true]);
  });
  it("xỉu 2.5 đúng khi ≤2 bàn", () => {
    expect(chamDong(d({ tx: "Xỉu 2.5", kq: [1, 1] }))?.dungTx).toBe(true);
  });
  it("hai đội ghi bàn: Không, đá 1-0 → đúng", () => {
    expect(chamDong(d({ btts: "Không", kq: [1, 0] }))?.dungBtts).toBe(true);
  });
  it("không có dự đoán tài xỉu → null, không tính", () => {
    expect(chamDong(d({ kq: [1, 0] }))?.dungTx).toBeNull();
  });
  it("chưa có kết quả → null", () => {
    expect(chamDong(d({}))).toBeNull();
  });
});

describe("gopSo", () => {
  it("bỏ dòng chưa có kết quả, dòng sau đè dòng trước cùng trận", () => {
    const g = gopSo([d({ kq: [0, 0] }), d({ nha: "C" })], [d({ kq: [1, 0] })]);
    expect(g.map((x) => x.kq)).toEqual([[1, 0]]);
  });
});

describe("tongThanhTich + theoNgay", () => {
  const ds = [d({ kq: [2, 1], tx: "Tài 2.5" }), d({ ngay: "2026-11-11", kq: [0, 1] })].flatMap((x) => chamDong(x) ?? []);
  it("đếm đúng/tổng từng loại", () => {
    const t = tongThanhTich(ds);
    expect([t.ketQua, t.tySo, t.taiXiu, t.tuNgay, t.denNgay]).toEqual([
      { tran: 2, dung: 1 },
      { tran: 2, dung: 1 },
      { tran: 1, dung: 1 },
      "2026-11-10",
      "2026-11-11",
    ]);
  });
  it("ngày mới nhất trước", () => {
    expect(theoNgay(ds).map(([n]) => n)).toEqual(["2026-11-11", "2026-11-10"]);
  });
});
