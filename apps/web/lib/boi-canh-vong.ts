import type { StandingTeam } from "./standings";

type Cap = { homeName: string; awayName: string };

const chuan = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Tra hạng một đội trong bảng (cùng nguồn Livescore nên so tên đã chuẩn hoá là đủ). */
export function hangCua(bang: StandingTeam[], ten: string): StandingTeam | undefined {
  const k = chuan(ten);
  return bang.find((r) => chuan(r.name) === k);
}

/**
 * Đoạn bối cảnh BXH trước vòng tới — mọi con số lấy từ bảng thật (16/11: /du-doan/cup-c1 chỉ ~215 chữ
 * khi giải nghỉ). Thiếu bảng hoặc không khớp đội nào → null, không bịa.
 */
export function boiCanhVongToi(vong: Cap[], bang: StandingTeam[], ten: string): string | null {
  if (bang.length === 0 || vong.length === 0) return null;
  const xep = bang.slice().sort((a, b) => a.rank - b.rank);
  const dau = xep[0];
  const cap = vong
    .map((m) => ({ m, a: hangCua(bang, m.homeName), b: hangCua(bang, m.awayName) }))
    .filter((x): x is { m: Cap; a: StandingTeam; b: StandingTeam } => Boolean(x.a && x.b));
  if (cap.length === 0) return null;
  const cau = [`Trước vòng tới, ${dau.name} đứng đầu ${ten} với ${dau.points} điểm sau ${dau.played} trận.`];
  const nong = cap
    .slice()
    .sort((x, y) => x.a.rank + x.b.rank - (y.a.rank + y.b.rank))
    .slice(0, 3)
    .map(({ a, b }) => `${a.name} (hạng ${a.rank}) gặp ${b.name} (hạng ${b.rank})`);
  cau.push(`Cặp đấu giữa các đội xếp cao nhất: ${nong.join("; ")}.`);
  const lech = cap
    .map(({ a, b }) => ({ a, b, d: Math.abs(a.points - b.points) }))
    .sort((x, y) => y.d - x.d)[0];
  if (lech && lech.d > 0) {
    const [tren, duoi] = lech.a.points >= lech.b.points ? [lech.a, lech.b] : [lech.b, lech.a];
    cau.push(`Chênh lệch lớn nhất: ${tren.name} hơn ${duoi.name} ${lech.d} điểm.`);
  }
  return cau.join(" ");
}
