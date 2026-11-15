import { describe, expect, it } from "vitest";
import { tomTatBanThang } from "./bxh-ban-thang";

const d = (name: string, played: number, goals_for: number, goals_against: number) => ({ name, played, goals_for, goals_against });

describe("tomTatBanThang", () => {
  it("bảng chưa đá trận nào thì không viết gì", () => {
    expect(tomTatBanThang([d("A", 0, 0, 0), d("B", 0, 0, 0)], "Cúp C1")).toBeNull();
  });
  it("tính tổng bàn, số trận, bàn mỗi trận, hàng công và hàng thủ từ bảng", () => {
    const s = tomTatBanThang([d("A", 2, 5, 1), d("B", 2, 2, 3), d("C", 2, 1, 4)], "Cúp C1")!;
    expect(s).toContain("Cúp C1 đã có 8 bàn sau 3 trận, trung bình 2,7 bàn mỗi trận");
    expect(s).toContain("Hàng công tốt nhất: A (5 bàn sau 2 trận)");
    expect(s).toContain("Hàng thủ tốt nhất: A (thủng lưới 1 bàn sau 2 trận)");
  });
});
