// Chạy như lib/du-doan.test.ts (mượn vitest của apps/worker).
import { describe, expect, it } from "vitest";
import { kenhTheoTenViet } from "./kenh-phat-song";
import { tenGiaiViet } from "./ten-viet";

describe("tenGiaiViet — 5 giải lớn từ tệp PredictZ vòng kế", () => {
  it("bỏ tên nước trước tên giải (trang trận từng hiện 'Dự đoán Germany Bundesliga cùng ngày')", () => {
    expect(["Germany Bundesliga", "France Ligue 1", "Italy Serie A", "Spain La Liga", "England Premier League"].map(tenGiaiViet))
      .toEqual(["Bundesliga", "Ligue 1", "Serie A", "La Liga", "Ngoại hạng Anh"]);
  });

  it("tên Việt khớp được kênh phát sóng (dòng kênh từng ẩn ở trận Bundesliga/Ligue 1/Serie A)", () => {
    expect(["Germany Bundesliga", "France Ligue 1", "Italy Serie A"].map((g) => kenhTheoTenViet(tenGiaiViet(g))?.kenh))
      .toEqual(["TV360", "VTVcab", "VTVcab"]);
  });
});
