/**
 * Bảng xếp hạng tách sân nhà / sân khách, tính từ chính các trận đã đá của giải
 * (không cần nguồn thứ hai). Hàm THUẦN: nhận danh sách trận, trả hàng bảng.
 */
import type { StandingTeam } from "./standings";

export interface TranDaDa {
  home: string;
  away: string;
  /** Tỷ số sau 90 phút: [chủ nhà, khách]. */
  kq: [number, number];
}

export type SanDa = "nha" | "khach";

type Hang = Pick<StandingTeam, "name" | "played" | "won" | "drawn" | "lost" | "goals_for" | "goals_against" | "goal_diff" | "points">;

const moi = (name: string): Hang => ({ name, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0 });

/**
 * Gộp thành tích của mỗi đội khi đá `san`. Xếp theo điểm, hiệu số, bàn thắng, rồi tên;
 * `rank` đánh lại từ 1 theo thứ tự đó. `doi` (nếu có) ép đủ đội kể cả đội chưa đá trận nào ở sân đó.
 */
export function tinhBxhSan(tran: readonly TranDaDa[], san: SanDa, doi: readonly string[] = []): StandingTeam[] {
  const bang = new Map<string, Hang>(doi.map((d) => [d, moi(d)]));
  for (const t of tran) {
    const ten = san === "nha" ? t.home : t.away;
    const [ghi, thua] = san === "nha" ? t.kq : [t.kq[1], t.kq[0]];
    const h = bang.get(ten) ?? moi(ten);
    h.played += 1;
    h.goals_for += ghi;
    h.goals_against += thua;
    if (ghi > thua) { h.won += 1; h.points += 3; }
    else if (ghi === thua) { h.drawn += 1; h.points += 1; }
    else h.lost += 1;
    h.goal_diff = h.goals_for - h.goals_against;
    bang.set(ten, h);
  }
  return [...bang.values()]
    .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for || a.name.localeCompare(b.name))
    .map((h, i) => ({ ...h, rank: i + 1, form: "", groupName: "", stageName: "" }));
}

/**
 * Chỉ tin bảng tách sân khi cộng sân nhà + sân khách ra ĐÚNG số trận của bảng tổng
 * ở mọi đội: lịch sử thiếu trận (trang API cụt, giải đổi tên đội) thì ẩn tab còn hơn hiện số sai.
 */
export function khopBangTong(tong: readonly StandingTeam[], nha: readonly StandingTeam[], khach: readonly StandingTeam[]): boolean {
  if (tong.length === 0) return false;
  const dem = (ds: readonly StandingTeam[]) => new Map(ds.map((d) => [d.name, d]));
  const n = dem(nha);
  const k = dem(khach);
  return tong.every((t) => {
    const a = n.get(t.name);
    const b = k.get(t.name);
    return !!a && !!b && a.played + b.played === t.played && a.points + b.points === t.points;
  });
}
