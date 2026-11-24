// Hợp lệ dữ liệu tệp tuần (tệp thật, làm mới hằng sáng); phần dòng gắn bài nhận định ở du-doan-tuan-bai.test.ts.
import { describe, expect, it } from "vitest";
import { dongTuan, htftDiemTuan, slugTuan } from "./du-doan-tuan";
import { docDiem, docHtft } from "./tran-htft";

describe("htftDiemTuan — Hiệp 1 / Cả trận và điểm tấn công / phòng ngự", () => {
  it("slug không có trong tệp → null", () => {
    expect(htftDiemTuan("khong-co-tran-nay")).toBeNull();
  });

  it("mọi dòng tệp có htft/diem đều qua kiểm hợp lệ; dòng không có → null (khối ẩn)", () => {
    for (const d of dongTuan()) {
      const r = htftDiemTuan(slugTuan(d));
      if (d.htft && docHtft(d.htft)) expect(r?.htft).toBeDefined();
      if (d.diem && docDiem(d.diem.n) && docDiem(d.diem.k)) expect(r?.diem).toBeDefined();
      if (!d.htft && !d.diem) expect(r).toBeNull();
    }
  });
});

describe("tỷ lệ làm mới hằng sáng — dữ liệu tệp tuần", () => {
  const hopLe = (x: number) => Number.isFinite(x) && x > 1;
  it("pDnb, pKqBtts, pKqOu, diem.c: có thì phải đủ khoá và mọi giá > 1 / điểm 1–10", () => {
    for (const d of dongTuan()) {
      if (d.pDnb) expect(d.pDnb.length === 2 && d.pDnb.every(hopLe)).toBe(true);
      if (d.pKqBtts) expect(Object.keys(d.pKqBtts).sort()).toEqual(["hN", "hY", "kN", "kY", "nN", "nY"]);
      if (d.pKqOu) expect(Object.keys(d.pKqOu).sort()).toEqual(["hT", "hX", "kT", "kX", "nT", "nX"]);
      for (const k of [d.pKqBtts, d.pKqOu]) if (k) expect(Object.values(k).every(hopLe)).toBe(true);
      if (d.diem?.c) expect(d.diem.c.length === 2 && d.diem.c.every((x) => Number.isInteger(x) && x >= 1 && x <= 10)).toBe(true);
    }
  });
});
