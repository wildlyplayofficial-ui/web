// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { tranDuocIndex } from "./chi-muc";
import type { HangDuDoan } from "./du-doan-hang";
import { cauHaiDoiGhi, cauThang, cauTomTat, giaiThichTaiXiu, metaTran, ngayTabDuDoan, tieuDeH1, tieuDeTran, timTran, tranLienQuan } from "./du-doan-tran";

const tran = (slug: string, sua: Partial<HangDuDoan> = {}): HangDuDoan => ({
  slug, coBai: false, giai: "Nations League", kickoffUtc: "2026-11-12T19:45:00Z", ngay: "2026-11-13", gio: "02:45",
  nha: "Anh", khach: "Croatia", logoNha: null, logoKhach: null, anhNha: null, anhKhach: null, creditAnh: null,
  du: [3, 0], that: null, dung: null, dungTySo: null, san: null, sapDa: true, pick: false, mot: [1.27, 6.5, 9],
  formNha: null, formKhach: null, doiDau: null, taiXiu: "Tài 2.5", haiDoiGhi: false, nhan: [], ...sua,
});
const ANH = tran("tuan-2026-11-12-england-croatia");

describe("tiêu đề + meta trang trận", () => {
  it("h1 /du-doan theo ngày", () => {
    expect(tieuDeH1("2026-11-13")).toBe("Dự đoán bóng đá Thứ Sáu, ngày 13 tháng 11 năm 2026");
  });

  it("h1 trang trận có giờ và ngày", () => {
    expect(tieuDeTran(ANH)).toBe("Dự đoán Anh vs Croatia, 02h45 ngày 13/11");
  });

  it("trận chưa ghép được giờ thì h1 bỏ giờ", () => {
    expect(tieuDeTran({ ...ANH, gio: "--:--" })).toBe("Dự đoán Anh vs Croatia, ngày 13/11");
  });

  it("title + description lấy từ số của trận", () => {
    expect(metaTran(ANH)).toEqual({
      tieuDe: "Dự đoán Anh vs Croatia ngày 13/11",
      moTa: "Dự đoán tỷ số Anh vs Croatia (Nations League), 02h45 ngày 13/11/2026 giờ Việt Nam: Anh thắng Croatia 3-0. Tỷ lệ 1·X·2: 1.27 · 6.50 · 9.00.",
    });
  });
});

describe("câu chữ sinh từ số", () => {
  it("khách thắng thì ghi bàn đội thắng trước", () => {
    expect(cauThang({ nha: "CH Séc", khach: "Tây Ban Nha", du: [0, 2] })).toBe("Tây Ban Nha thắng CH Séc 2-0");
  });

  it("chưa chốt tỷ số thì không có câu", () => {
    expect(cauThang({ nha: "Anh", khach: "Croatia", du: null })).toBeNull();
  });

  it("tài 2.5 = từ 3 bàn, xỉu 2.5 = nhiều nhất 2 bàn", () => {
    expect([giaiThichTaiXiu("Tài 2.5"), giaiThichTaiXiu("Xỉu 2.5")]).toEqual(["dự đoán trận có từ 3 bàn trở lên", "dự đoán trận có nhiều nhất 2 bàn"]);
  });

  it("'Không' + tỷ số 3-0 → chỉ một đội ghi bàn; nguồn không ghi → null", () => {
    expect([cauHaiDoiGhi(ANH), cauHaiDoiGhi({ haiDoiGhi: null, du: [3, 0] })]).toEqual(["chỉ một đội ghi bàn", null]);
  });

  it("đoạn tóm tắt trước trận", () => {
    expect(cauTomTat(ANH)).toBe(
      "banhbong.net dự đoán Anh thắng Croatia 3-0 ở Nations League, trận đá lúc 02h45 thứ Sáu 13/11 giờ Việt Nam. Tỷ lệ 1·X·2 đang là 1.27 · 6.50 · 9.00. Dự đoán kèm theo: Tài 2.5, chỉ một đội ghi bàn.",
    );
  });

  it("đá xong thì thêm kết quả + chấm đúng/sai", () => {
    const xong = tran("x", { sapDa: false, that: [2, 0], dung: true, dungTySo: false, mot: null, taiXiu: null, haiDoiGhi: null });
    expect(cauTomTat(xong)).toContain("Kết quả: Anh 2-0 Croatia, dự đoán đúng kết quả.");
  });
});

describe("tìm trận + trận liên quan", () => {
  const cung = ["a", "b", "c"].map((s, i) => tran(s, { kickoffUtc: `2026-11-12T1${i}:00:00Z` }));
  const khac = tran("d", { giai: "Hạng 3 Anh", ngay: "2026-11-14", kickoffUtc: "2026-11-14T15:00:00Z" });

  it("tìm theo slug; slug lạ → null (trang 404)", () => {
    expect([timTran([ANH, khac], "d")?.giai, timTran([ANH, khac], "khong-co")]).toEqual(["Hạng 3 Anh", null]);
  });

  it("≥3 trận cùng giải cùng ngày → nhóm cùng ngày, không kèm chính nó", () => {
    const kq = tranLienQuan([ANH, ...cung, khac], ANH);
    expect([kq.cungNgay, kq.ds.map((x) => x.slug)]).toEqual([true, ["a", "b", "c"]]);
  });

  it("không đủ 3 → trận kế tiếp, thiếu thì bù trận ngay trước", () => {
    const kq = tranLienQuan([ANH, cung[0], khac], ANH);
    expect([kq.cungNgay, kq.ds.map((x) => x.slug)]).toEqual([false, ["d", "a"]]);
  });
});

describe("tranDuocIndex", () => {
  it.each([
    ["Nations League", "Anh", "Croatia", true],
    ["Ngoại hạng Anh", "Arsenal", "Chelsea", true],
    ["Gia Lai VTV Cup 2026", "U23 Việt Nam", "U23 Thái Lan", true],
    ["Hạng 6 Anh miền Bắc", "Darlington", "Oxford City", false],
    ["VĐQG Bắc Ireland", "Larne", "Linfield", false],
    ["Serie C Ý", "Arezzo", "Pisa", false],
  ])("%s · %s – %s → %s", (giai, nha, khach, mong) => {
    expect(tranDuocIndex({ giai, nha, khach })).toBe(mong);
  });
});

describe("ngayTabDuDoan", () => {
  it("không hiện hôm qua, bắt đầu từ hôm nay, chỉ ngày có trận", () => {
    const r = ngayTabDuDoan("2026-11-11", new Set(["2026-11-10", "2026-11-11", "2026-11-13"]));
    expect(r).toEqual({ ngays: ["2026-11-11", "2026-11-13"], macDinh: "2026-11-11" });
  });

  it("hôm nay không có trận → mặc định ngày tới gần nhất", () => {
    expect(ngayTabDuDoan("2026-11-11", new Set(["2026-11-10", "2026-11-12"])).macDinh).toBe("2026-11-12");
  });

  it("chỉ có trận hôm qua → một tab hôm nay", () => {
    expect(ngayTabDuDoan("2026-11-11", new Set(["2026-11-10"]))).toEqual({ ngays: ["2026-11-11"], macDinh: "2026-11-11" });
  });
});
