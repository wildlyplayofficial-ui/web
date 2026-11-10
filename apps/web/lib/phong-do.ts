/**
 * Phong độ 5 trận + màu kết quả dự đoán (kiểu PredictZ, Peter duyệt 10/11).
 * Hàm THUẦN (dùng được ở client); đọc CSDL ở lib/phong-do-db.ts.
 * Không đủ 5 trận đã có tỷ số thì KHÔNG hiện ô — không bịa, không ô rỗng.
 */
import { tenSo } from "./du-doan-cham";

export type KQ = "T" | "H" | "B";

export interface TranDaDa {
  home: string;
  away: string;
  kickoff_utc: string;
  home_score: number;
  away_score: number;
}

const SO_TRAN = 5;

/** 5 trận gần nhất của đội TRƯỚC mốc `truoc`, mới nhất trước. Thiếu trận → null.
 *  Bỏ dòng trùng (bảng fixtures có cặp trùng cùng trận, xem match-context dedupeFixtures). */
export function phongDo(rows: readonly TranDaDa[], doi: string, truoc: string): KQ[] | null {
  const ten = tenSo(doi);
  const moc = Date.parse(truoc);
  const daThay = new Set<string>();
  const kq: KQ[] = [];
  const cua = rows
    .filter((r) => (tenSo(r.home) === ten || tenSo(r.away) === ten) && Date.parse(r.kickoff_utc) < moc)
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
  for (const r of cua) {
    const khoa = `${tenSo(r.home)}|${tenSo(r.away)}|${r.kickoff_utc.slice(0, 10)}`;
    if (daThay.has(khoa)) continue;
    daThay.add(khoa);
    const nha = tenSo(r.home) === ten;
    const ghi = nha ? r.home_score : r.away_score;
    const thung = nha ? r.away_score : r.home_score;
    kq.push(ghi > thung ? "T" : ghi < thung ? "B" : "H");
    if (kq.length === SO_TRAN) return kq;
  }
  return null;
}

export type ChieuDuDoan = "nha" | "hoa" | "khach";

/** Tỷ số dự đoán → đội nhà thắng / hoà / đội khách thắng (quyết định màu ô). */
export function chieuDuDoan(du: readonly [number, number]): ChieuDuDoan {
  return du[0] > du[1] ? "nha" : du[0] < du[1] ? "khach" : "hoa";
}

/** Lớp màu viền + chữ, cùng bảng màu cho ô phong độ (T=nhà thắng xanh, H vàng, B hồng). */
export const MAU = {
  xanh: "border-emerald-500 text-emerald-500",
  vang: "border-amber-500 text-amber-500",
  hong: "border-pink-500 text-pink-500",
} as const;

export const mauChieu = (c: ChieuDuDoan) => (c === "nha" ? MAU.xanh : c === "hoa" ? MAU.vang : MAU.hong);
export const mauKQ = (k: KQ) => (k === "T" ? MAU.xanh : k === "H" ? MAU.vang : MAU.hong);
