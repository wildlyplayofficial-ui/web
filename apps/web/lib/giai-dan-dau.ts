import type { StandingTeam } from "./standings";
import { GIAI_TRANG } from "./du-doan-loc";

/**
 * Một dòng "ai đang dẫn đầu" cho thẻ giải ở /competitions, lấy thẳng từ bảng xếp hạng thật.
 * Bảng rỗng, bảng chia nhiều bảng đấu (World Cup), hoặc chưa đá trận nào → null (không bịa chữ).
 */
export function dongDanDau(rows: readonly StandingTeam[]): string | null {
  if (rows.length === 0) return null;
  const bang = new Set(rows.map((r) => r.groupName).filter(Boolean));
  if (bang.size > 1) return null;
  const dau = rows.reduce((a, b) => (b.rank < a.rank ? b : a));
  if (!dau.name || dau.played <= 0) return null;
  const cau = [`${dau.name} dẫn đầu với ${dau.points} điểm sau ${dau.played} trận.`];
  // 16/11 làm dày /competitions (187 chữ): thêm đội nhì + khoảng cách, và bàn mỗi trận — đều từ bảng.
  const nhi = rows.filter((r) => r !== dau).reduce<StandingTeam | null>((a, b) => (!a || b.rank < a.rank ? b : a), null);
  if (nhi && nhi.name) {
    const cach = dau.points - nhi.points;
    cau.push(cach > 0 ? `${nhi.name} xếp nhì, kém ${cach} điểm.` : `${nhi.name} xếp nhì, bằng điểm.`);
  }
  const tongTran = rows.reduce((t, r) => t + r.played, 0) / 2;
  const tongBan = rows.reduce((t, r) => t + r.goals_for, 0);
  if (tongTran > 0 && tongBan > 0) cau.push(`Trung bình ${(tongBan / tongTran).toFixed(1).replace(".", ",")} bàn mỗi trận.`);
  return cau.join(" ");
}

/** Slug trang dự đoán (/du-doan/{slug}) ứng với slug trang giải, nếu giải có trang dự đoán. */
export function duDoanCuaGiai(bxh: string): { slug: string; ten: string } | null {
  const g = GIAI_TRANG.find((x) => x.bxh === bxh);
  return g ? { slug: g.slug, ten: g.ten } : null;
}
