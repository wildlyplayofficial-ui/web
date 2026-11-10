// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
// Số mẫu: 10 trận gần nhất của Darlington và Oxford City trước trận 10/11/2026 (chỉ dùng trong test).
import { describe, expect, it } from "vitest";
import { phongDo, phongDoCuTruoc, type TranDaDa } from "./phong-do";
import { bxConMoi, cauBanThang, cauSan, conMoi, kqCuaDoi, ngayNgan, phongDoTuTran, thanhTich, type TranGanDay } from "./tran-so-lieu";

const GN: TranGanDay[] = [
  {"ngay": "2026-10-31", "nha": "Spalding United", "khach": "Darlington", "tsn": 3, "tsk": 2},
  {"ngay": "2026-10-27", "nha": "Morecambe", "khach": "Darlington", "tsn": 1, "tsk": 0},
  {"ngay": "2026-10-24", "nha": "Darlington", "khach": "Spennymoor Town", "tsn": 3, "tsk": 0},
  {"ngay": "2026-10-17", "nha": "Telford Utd", "khach": "Darlington", "tsn": 2, "tsk": 1},
  {"ngay": "2026-10-10", "nha": "Darlington", "khach": "Merthyr Town", "tsn": 1, "tsk": 1},
  {"ngay": "2026-09-26", "nha": "Darlington", "khach": "Hebburn Town", "tsn": 1, "tsk": 1},
  {"ngay": "2026-09-12", "nha": "Marine FC", "khach": "Darlington", "tsn": 2, "tsk": 1},
  {"ngay": "2026-09-08", "nha": "Chorley", "khach": "Darlington", "tsn": 5, "tsk": 2},
  {"ngay": "2026-09-05", "nha": "Darlington", "khach": "Kings Lynn", "tsn": 0, "tsk": 2},
  {"ngay": "2026-08-31", "nha": "Radcliffe Borough", "khach": "Darlington", "tsn": 0, "tsk": 1},
];
const GK: TranGanDay[] = [
  {"ngay": "2026-10-31", "nha": "Oxford City", "khach": "South Shields", "tsn": 1, "tsk": 3},
  {"ngay": "2026-10-27", "nha": "Oxford City", "khach": "Merthyr Town", "tsn": 3, "tsk": 0},
  {"ngay": "2026-10-24", "nha": "Marine FC", "khach": "Oxford City", "tsn": 1, "tsk": 1},
  {"ngay": "2026-10-10", "nha": "Hebburn Town", "khach": "Oxford City", "tsn": 0, "tsk": 3},
  {"ngay": "2026-09-26", "nha": "Oxford City", "khach": "Morecambe", "tsn": 1, "tsk": 1},
  {"ngay": "2026-09-12", "nha": "Radcliffe Borough", "khach": "Oxford City", "tsn": 0, "tsk": 3},
  {"ngay": "2026-09-08", "nha": "Telford Utd", "khach": "Oxford City", "tsn": 1, "tsk": 0},
  {"ngay": "2026-09-05", "nha": "Oxford City", "khach": "Chorley", "tsn": 4, "tsk": 0},
  {"ngay": "2026-08-31", "nha": "Worksop Town", "khach": "Oxford City", "tsn": 0, "tsk": 1},
  {"ngay": "2026-08-28", "nha": "Oxford City", "khach": "Buxton", "tsn": 2, "tsk": 3},
];

describe("chiều dải phong độ: trái = cũ nhất, phải = mới nhất", () => {
  it("Darlington đọc H B T B B (tệp ghi D L W L L)", () => {
    expect(phongDoTuTran(GN, "Darlington")).toEqual(["H", "B", "T", "B", "B"]);
  });

  it("Oxford City đọc H T H T B (tệp ghi D W D W L)", () => {
    expect(phongDoTuTran(GK, "Oxford City")).toEqual(["H", "T", "H", "T", "B"]);
  });

  it("danh sách đưa vào lộn thứ tự vẫn ra đúng chiều", () => {
    expect(phongDoTuTran([...GN].reverse(), "Darlington")).toEqual(["H", "B", "T", "B", "B"]);
  });

  it("phong độ bù từ CSDL cũng cũ nhất trước (đảo của phongDo)", () => {
    const rows: TranDaDa[] = GN.map((t) => ({ home: t.nha, away: t.khach, kickoff_utc: `${t.ngay}T15:00:00Z`, home_score: t.tsn, away_score: t.tsk }));
    const moc = "2026-11-10T19:45:00Z";
    expect([phongDoCuTruoc(rows, "Darlington", moc), phongDo(rows, "Darlington", moc)]).toEqual([
      ["H", "B", "T", "B", "B"],
      ["B", "B", "T", "B", "H"],
    ]);
  });

  it("chưa đủ 5 trận hoặc không có danh sách → null", () => {
    expect([phongDoTuTran(GN.slice(0, 4), "Darlington"), phongDoTuTran(undefined, "Darlington")]).toEqual([null, null]);
  });
});

describe("thành tích tính từ các trận gần nhất", () => {
  it("kết quả nhìn từ từng đội; đội không đá trận đó → null", () => {
    expect([kqCuaDoi(GN[0], "Darlington"), kqCuaDoi(GN[0], "Spalding United"), kqCuaDoi(GN[0], "Oxford City")]).toEqual(["B", "T", null]);
  });

  it("Darlington đá sân nhà: 4 trận, 1 thắng 2 hòa 1 thua", () => {
    expect(thanhTich(GN, "Darlington", "nha")).toEqual({ tran: 4, t: 1, h: 2, b: 1, ghi: 5, thung: 4 });
  });

  it("Oxford City đá sân khách: 5 trận, 3 thắng 1 hòa 1 thua", () => {
    expect(thanhTich(GK, "Oxford City", "khach")).toEqual({ tran: 5, t: 3, h: 1, b: 1, ghi: 8, thung: 2 });
  });

  it("cả 10 trận của Darlington: 2 thắng 2 hòa 6 thua, ghi 12 thủng 17", () => {
    expect(thanhTich(GN, "Darlington")).toEqual({ tran: 10, t: 2, h: 2, b: 6, ghi: 12, thung: 17 });
  });

  it("câu sân nhà / sân khách", () => {
    expect([cauSan(thanhTich(GN, "Darlington", "nha"), "nha"), cauSan(thanhTich(GK, "Oxford City", "khach"), "khach")]).toEqual([
      "Sân nhà: 4 trận, 1 thắng · 2 hòa · 1 thua",
      "Sân khách: 5 trận, 3 thắng · 1 hòa · 1 thua",
    ]);
  });

  it("câu bàn thắng mỗi trận", () => {
    expect(cauBanThang(thanhTich(GN, "Darlington"))).toBe("Trung bình mỗi trận: ghi 1.2 bàn, thủng lưới 1.7 bàn");
  });

  it("không có trận nào thì không có câu", () => {
    expect([cauSan(thanhTich([], "Darlington", "nha"), "nha"), cauBanThang(thanhTich([], "Darlington"))]).toEqual([null, null]);
  });

  it("ngày ngắn", () => {
    expect(ngayNgan("2026-10-31")).toBe("31/10");
  });
});

describe("danh sách trận gần nhất bị cũ thì bỏ", () => {
  it("trận mới nhất cách ngày đá ≤30 ngày → giữ", () => {
    expect(conMoi(GN, "2026-11-10")).toBe(GN);
  });

  it("trận mới nhất cách ngày đá >30 ngày → bỏ (Serie C 12/9 cho trận 13/11)", () => {
    expect(conMoi([{ ngay: "2026-09-12", nha: "Gubbio", khach: "Latina", tsn: 3, tsk: 1 }], "2026-11-13")).toBeUndefined();
  });

  it("danh sách rỗng hoặc không có → bỏ", () => {
    expect(conMoi([], "2026-11-10")).toBeUndefined();
    expect(conMoi(undefined, "2026-11-10")).toBeUndefined();
  });
});

describe("dòng bảng xếp hạng đi cùng danh sách trận cũ thì cũng bỏ", () => {
  const BX = { hang: 15, tran: 4, t: 1, h: 1, b: 2, bt: 4, bb: 6, diem: 4 };
  it("danh sách còn mới → giữ dòng BXH", () => {
    expect(bxConMoi(BX, GN, "2026-11-10")).toBe(BX);
  });
  it("danh sách cũ >30 ngày → bỏ dòng BXH (Latina 4 trận giữa tháng 11)", () => {
    expect(bxConMoi(BX, [{ ngay: "2026-09-12", nha: "Gubbio", khach: "Latina", tsn: 3, tsk: 1 }], "2026-11-13")).toBeUndefined();
  });
  it("không có danh sách để đối chiếu → giữ dòng BXH", () => {
    expect(bxConMoi(BX, undefined, "2026-11-13")).toBe(BX);
  });
});
