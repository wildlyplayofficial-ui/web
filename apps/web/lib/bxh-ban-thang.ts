/**
 * Một câu về bàn thắng của cả giải, tính từ chính bảng xếp hạng đang hiện (16/11: trang giải
 * ngoài 5 giải lớn, như Cúp C1, chỉ có bảng trần). Không số nào bịa: hàng công tốt nhất = nhiều
 * bàn ghi nhất, hàng thủ tốt nhất = ít bàn thua nhất, bàn mỗi trận = tổng bàn / số trận.
 * Hàm THUẦN, import tương đối để vitest chạy không cần alias.
 */
import type { StandingTeam } from "./standings";

type Dong = Pick<StandingTeam, "name" | "played" | "goals_for" | "goals_against">;

const so = (n: number) => n.toFixed(1).replace(".", ",");

export function tomTatBanThang(rows: readonly Dong[], ten: string): string | null {
  const da = rows.filter((r) => r.played > 0);
  if (da.length < 2) return null;
  const tongBan = da.reduce((t, r) => t + r.goals_for, 0);
  // Mỗi trận được hai đội cùng tính một lần trong cột "đã đá".
  const tongTran = da.reduce((t, r) => t + r.played, 0) / 2;
  if (tongTran === 0) return null;
  const cong = da.reduce((a, b) => (b.goals_for > a.goals_for ? b : a));
  const thu = da.reduce((a, b) => (b.goals_against < a.goals_against ? b : a));
  return (
    `${ten} đã có ${tongBan} bàn sau ${tongTran} trận, trung bình ${so(tongBan / tongTran)} bàn mỗi trận. ` +
    `Hàng công tốt nhất: ${cong.name} (${cong.goals_for} bàn sau ${cong.played} trận). ` +
    `Hàng thủ tốt nhất: ${thu.name} (thủng lưới ${thu.goals_against} bàn sau ${thu.played} trận).`
  );
}
