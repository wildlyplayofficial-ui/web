import { describe, expect, it } from "vitest";
import { GIAI_INDEX_TRAN, giaiBxhDuocIndex, tranDuocIndex } from "./chi-muc";
import { tenGiaiViet } from "./ten-viet";

const tuan = (giai: string, mong = false) => ({ slug: "tuan-2026-11-21-mancity-fulham", giai, mong });

describe("tranDuocIndex — chỉ 5 giải lớn + C1 (15/11)", () => {
  it.each(["England Premier League", "Spain La Liga", "Italy Serie A", "Germany Bundesliga", "France Ligue 1", "UEFA Champions League"])(
    "trang tuần %s đủ số liệu → index (cả tên gốc lẫn tên Việt)",
    (g) => {
      expect(tranDuocIndex(tuan(g))).toBe(true);
      expect(tranDuocIndex(tuan(tenGiaiViet(g)))).toBe(true);
    },
  );

  it("trang tuần giải lớn còn mỏng (mong) → noindex", () => {
    expect(tranDuocIndex(tuan("England Premier League", true))).toBe(false);
  });

  it.each(["VĐQG Brazil", "Algeria Ligue 1", "Spain Copa Del Rey", "Italy Serie C", "England League Two", "UEFA Nations League"])(
    "giải ngoài danh sách %s → noindex",
    (g) => {
      expect(tranDuocIndex(tuan(g))).toBe(false);
    },
  );

  it("bài nhận định tay của đội tuyển (Nations League) → noindex", () => {
    expect(tranDuocIndex({ slug: "nhan-dinh-na-uy-vs-xu-wales-15-11-2026", giai: "UEFA Nations League" })).toBe(false);
  });

  it("trận có Việt Nam ngoài 5 giải lớn → index (Peter 16/11)", () => {
    expect(tranDuocIndex({ slug: "nhan-dinh-viet-nam-vs-kyrgyzstan-17-11-2026", giai: "Giao hữu", nha: "Việt Nam", khach: "Kyrgyzstan" })).toBe(true);
    expect(tranDuocIndex({ ...tuan("AFC Asian Cup Qualification"), nha: "Malaysia", khach: "Vietnam" })).toBe(true);
    expect(tranDuocIndex({ ...tuan("AFC Asian Cup Qualification", true), nha: "Vietnam", khach: "Laos" })).toBe(false);
    expect(tranDuocIndex({ ...tuan("AFC Asian Cup Qualification"), nha: "Malaysia", khach: "Laos" })).toBe(false);
  });

  it("bài nhận định tay giải lớn → index", () => {
    expect(tranDuocIndex({ slug: "nhan-dinh-arsenal-vs-chelsea-22-11-2026", giai: "Ngoại hạng Anh" })).toBe(true);
  });

  it("hằng số là một regex duy nhất — đổi thành /./ là mở mọi giải", () => {
    expect(GIAI_INDEX_TRAN).toBeInstanceOf(RegExp);
  });
});

describe("giaiBxhDuocIndex", () => {
  it("giải không có bảng thật (World Cup 2026 đã xong) thì noindex", () => {
    expect(giaiBxhDuocIndex("world-cup-2026", 0)).toBe(false);
    expect(giaiBxhDuocIndex("champions-league", 0)).toBe(false);
  });
  it("có bảng thì index", () => expect(giaiBxhDuocIndex("champions-league", 36)).toBe(true));
  it("5 giải lớn luôn index vì tự dựng bảng từ trận đã đá", () => expect(giaiBxhDuocIndex("la-liga", 0)).toBe(true));
});
