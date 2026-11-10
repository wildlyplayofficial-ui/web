/**
 * Chấm bài dự đoán (hub /du-doan) — hàm THUẦN, không đụng CSDL, để soát tay được.
 *
 * Bài dự đoán = bài Desk `kind = 'preview'` cho MỘT trận (slug có "-vs-"), không
 * dính chữ cá cược. Bài lịch thi đấu / nhận định cả mùa / "soi kèo" cũ cũng mang
 * kind 'preview' nên kind một mình KHÔNG đủ (đo /analysis 10/11: 13 bài preview,
 * chỉ 3 bài là xem trước một trận).
 */
import type { AnalysisArticle, DuDoan } from "./types";

/** Chữ cá cược: bài dính chữ này không được lên hub (luật pháp lý VN). Slug mất dấu
 *  nên so theo TỪ NGUYÊN ("cuoc" đứng riêng sẽ bắt nhầm "cuộc đua"). */
const SLUG_CA_CUOC = /(^|-)(keo|ca-cuoc|cuoc-thu|nha-cai|ty-le|odds)(-|$)/;
const TUA_CA_CUOC = /kèo|cược|nhà cái|tỷ lệ|odds/i;

export function laBaiDuDoan(a: Pick<AnalysisArticle, "kind" | "slug" | "title">): boolean {
  if (a.kind !== "preview") return false;
  if (!a.slug.includes("-vs-")) return false;
  return !SLUG_CA_CUOC.test(a.slug) && !TUA_CA_CUOC.test(a.title);
}

/** Dự đoán đã chốt số: đủ hai con số nguyên. */
export type DuDoanChot = DuDoan & { home_goals: number; away_goals: number };

/** Có tỷ số dự đoán chốt TRƯỚC giờ bóng lăn thì mới được chấm. Bài đăng sau giờ
 *  đá (hoặc thiếu số) thì không tính — chấm bài viết sau khi biết kết quả là gian. */
export function duDoanChot(a: Pick<AnalysisArticle, "du_doan" | "published_at">): DuDoanChot | null {
  const d = a.du_doan;
  if (!d || !Number.isInteger(d.home_goals) || !Number.isInteger(d.away_goals)) return null;
  const ko = Date.parse(d.kickoff_utc);
  if (!Number.isFinite(ko) || Date.parse(a.published_at) >= ko) return null;
  return d as DuDoanChot;
}

/** Tên đội rút gọn để so (bỏ dấu, bỏ FC/AFC…). Cùng cách với lib/match-context `norm`. */
const HAU_TO = new Set(["fc", "afc", "cf", "sc", "ac", "club"]);
export function tenSo(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !HAU_TO.has(w))
    .join("");
}

export interface TySoThat {
  home: string;
  away: string;
  kickoff_utc: string;
  home_score: number;
  away_score: number;
}

/** Tìm tỷ số thật của trận: cùng hai đội (đúng chiều sân nhà), giờ đá lệch ≤ 2 ngày
 *  — bảng `fixtures` còn nhiều trận để giờ tạm, lệch một hai hôm so với giờ chốt. */
export function timTySo(d: DuDoan, rows: readonly TySoThat[]): TySoThat | null {
  const ko = Date.parse(d.kickoff_utc);
  const h = tenSo(d.home);
  const aw = tenSo(d.away);
  return rows
    .filter((r) => tenSo(r.home) === h && tenSo(r.away) === aw
      && Math.abs(Date.parse(r.kickoff_utc) - ko) <= 2 * 86_400_000)
    .sort((x, y) => Math.abs(Date.parse(x.kickoff_utc) - ko) - Math.abs(Date.parse(y.kickoff_utc) - ko))[0] ?? null;
}

const chieu = (h: number, a: number) => Math.sign(h - a);

export interface KetQuaCham {
  dungKetQua: boolean;
  dungTySo: boolean;
}

export function cham(d: DuDoanChot, that: Pick<TySoThat, "home_score" | "away_score">): KetQuaCham {
  return {
    dungKetQua: chieu(d.home_goals, d.away_goals) === chieu(that.home_score, that.away_score),
    dungTySo: d.home_goals === that.home_score && d.away_goals === that.away_score,
  };
}

export interface TongKet {
  tacGia: string;
  tran: number;
  dungKetQua: number;
  dungTySo: number;
}

/** Cộng dồn THEO TÁC GIẢ. Firewall Curator/Scout: mỗi byline một sổ, không bao giờ
 *  gộp thành một tổng chung. */
export function tongKetTheoTacGia(rows: readonly ({ tacGia: string } & KetQuaCham)[]): TongKet[] {
  const theo = new Map<string, TongKet>();
  for (const r of rows) {
    const t = theo.get(r.tacGia) ?? { tacGia: r.tacGia, tran: 0, dungKetQua: 0, dungTySo: 0 };
    theo.set(r.tacGia, {
      ...t,
      tran: t.tran + 1,
      dungKetQua: t.dungKetQua + (r.dungKetQua ? 1 : 0),
      dungTySo: t.dungTySo + (r.dungTySo ? 1 : 0),
    });
  }
  return [...theo.values()];
}
