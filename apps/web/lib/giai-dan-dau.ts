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
  return `${dau.name} dẫn đầu với ${dau.points} điểm sau ${dau.played} trận.`;
}

/** Slug trang dự đoán (/du-doan/{slug}) ứng với slug trang giải, nếu giải có trang dự đoán. */
export function duDoanCuaGiai(bxh: string): { slug: string; ten: string } | null {
  const g = GIAI_TRANG.find((x) => x.bxh === bxh);
  return g ? { slug: g.slug, ten: g.ten } : null;
}
