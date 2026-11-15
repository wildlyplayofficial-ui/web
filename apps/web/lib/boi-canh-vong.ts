import type { StandingTeam } from "./standings";

type Cap = { homeName: string; awayName: string };

// Lịch và BXH Livescore ghi tên lệch nhau (16/11: "Bayern Munich" ↔ "Bayern München", "SSC Napoli" ↔ "Napoli").
const DOI_TEN: Record<string, string> = { munchen: "munich", rasenballsport: "rb" };
const BO = new Set(["fc", "ssc", "as", "ac", "sc", "cf", "afc", "club", "cp", "sv", "vfb", "vfl", "1"]);
const tu = (s: string): string[] =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ø/g, "o")
      .split(/[^a-z0-9]+/).filter((w) => w && !BO.has(w)).map((w) => DOI_TEN[w] ?? w);

/** Tra hạng một đội: khớp nguyên tên đã chuẩn hoá, không thì khớp khi bộ chữ tên này chứa trọn tên kia. */
export function hangCua(bang: StandingTeam[], ten: string): StandingTeam | undefined {
  const k = tu(ten);
  if (k.length === 0) return undefined;
  const chua = (a: string[], b: string[]) => b.every((w) => a.includes(w));
  return bang.find((r) => tu(r.name).join(" ") === k.join(" "))
    ?? bang.find((r) => {
      const t = tu(r.name);
      return t.length > 0 && (chua(t, k) || chua(k, t));
    });
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
