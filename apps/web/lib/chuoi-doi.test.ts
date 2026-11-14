import { describe, expect, it } from "vitest";
import { chuoiCuaDoi, demChuoiLoai, mucChuoi } from "./chuoi-doi";
import type { TranGanDay } from "./tran-so-lieu";

// Mới nhất trước. "A" đá sân nhà khi nha === "A".
const t = (ngay: string, nha: string, khach: string, tsn: number, tsk: number): TranGanDay => ({ ngay, nha, khach, tsn, tsk });
const ds: TranGanDay[] = [
  t("2026-11-08", "A", "X", 2, 0),
  t("2026-11-01", "Y", "A", 1, 3),
  t("2026-10-25", "A", "Z", 3, 1),
  t("2026-10-18", "W", "A", 0, 1),
  t("2026-10-11", "A", "V", 1, 1),
  t("2026-10-04", "U", "A", 2, 0),
];

describe("demChuoiLoai", () => {
  it("chuỗi thắng dừng ở trận hoà", () => expect(demChuoiLoai(ds, "A", "thang")).toBe(4));
  it("không thua kéo qua trận hoà, dừng ở trận thua", () => expect(demChuoiLoai(ds, "A", "khongThua")).toBe(5));
  it("giữ sạch lưới tính theo đúng phía của đội", () => expect(demChuoiLoai(ds, "A", "giuSach")).toBe(1));
  it("tài: 2-0 chưa phải tài", () => expect(demChuoiLoai(ds, "A", "tai")).toBe(0));
  it("hai đội ghi bàn dừng ở trận có đội trắng bàn", () => expect(demChuoiLoai(ds, "A", "haiDoiGhi")).toBe(0));
  it("trận không có đội này bị bỏ qua, không cắt chuỗi", () => expect(demChuoiLoai([t("2026-11-09", "P", "Q", 0, 0), ...ds], "A", "thang")).toBe(4));
  it("danh sách rỗng → 0", () => expect(demChuoiLoai([], "A", "thang")).toBe(0));
});

describe("chuoiCuaDoi", () => {
  it("chỉ giữ chuỗi đạt ngưỡng, bỏ không-thua trùng chuỗi thắng", () => {
    const l = chuoiCuaDoi(ds, "A");
    expect(l.map((c) => c.loai)).toEqual(["thang"]);
    expect(l[0]).toMatchObject({ so: 4, tren: 6 });
  });
  it("giữ không-thua khi dài hơn chuỗi thắng", () => {
    expect(chuoiCuaDoi([t("2026-11-08", "A", "X", 0, 0), ...ds.slice(0)], "A").map((c) => c.loai)).toContain("khongThua");
  });
  it("thiếu danh sách → rỗng", () => expect(chuoiCuaDoi(undefined, "A")).toEqual([]));
});

describe("mucChuoi", () => {
  const dong = [
    { ngay: "2026-11-13", nha: "A", khach: "B", gn: ds, gk: [] },
    { ngay: "2026-11-14", nha: "A", khach: "C", gn: ds, gk: [] },
    { ngay: "2026-11-15", nha: "D", khach: "A", gn: [], gk: ds },
  ];
  it("mỗi đội lấy trận sắp tới sớm nhất, bỏ trận đã qua", () => {
    const m = mucChuoi(dong, "2026-11-14");
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ doi: "A", doiThu: "C", laNha: true, so: 4 });
  });
  it("hàm lọc danh sách cũ được áp dụng", () => {
    expect(mucChuoi(dong, "2026-11-14", () => undefined)).toEqual([]);
  });
});
