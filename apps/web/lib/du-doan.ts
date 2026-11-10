import { unstable_cache } from "next/cache";
import { getAnalysisArticles } from "./analysis-articles";
import { getSupabase } from "./supabase";
import { dungMuc, laBaiDuDoan, type DuDoanChot, type KetQuaCham, type TySoThat } from "./du-doan-cham";
import { duDoanCua, type DuDoanDayDu } from "./du-doan-nguon";
import type { AnalysisArticle } from "./types";

/**
 * Dữ liệu hub /du-doan: bài dự đoán + tỷ số thật để chấm đúng/sai.
 *
 * Tỷ số thật KHÔNG gõ tay: lấy từ hai bảng worker đã ghi sẵn —
 *  - `fixtures` (home_score/away_score, cùng nguồn trang trận + BXH dùng ở lib/match-context)
 *  - `match_live_state` status 'finished' (worker persist-state, bù khi fixtures chưa có số)
 * Sổ pick (/track-record) đo thứ khác (thắng/thua theo đơn vị), nên KHÔNG gộp vào đây.
 */

/** Trần bài kéo về — cùng trần với mục lục /analysis. */
const TRAN_BAI = 300;

export interface MucDuDoan {
  bai: AnalysisArticle;
  /** Trận + tỷ số dự đoán (cột du_doan, hoặc lib/data/du-doan.json). */
  duDoan: DuDoanDayDu | null;
  /** Giờ đá. null = bài chưa khai trận → không xếp được sắp/đã đá. */
  kickoffUtc: string | null;
  sapDa: boolean;
  /** Tỷ số dự đoán đã chốt trước giờ đá, nếu có. */
  chot: DuDoanChot | null;
  /** Tỷ số thật + chấm điểm, chỉ khi trận đã đá và tìm được tỷ số. */
  ketQua: (KetQuaCham & { that: TySoThat }) | null;
}

async function getTySoThatImpl(tu: string, den: string): Promise<TySoThat[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const [fx, live] = await Promise.all([
    supabase
      .from("fixtures")
      .select("home_team_name, away_team_name, kickoff_utc, home_score, away_score")
      .gte("kickoff_utc", tu)
      .lte("kickoff_utc", den)
      .not("home_score", "is", null)
      .not("away_score", "is", null),
    supabase
      .from("match_live_state")
      .select("home_team, away_team, kickoff_utc, home_score, away_score")
      .eq("status", "finished")
      .gte("kickoff_utc", tu)
      .lte("kickoff_utc", den)
      .not("home_score", "is", null)
      .not("away_score", "is", null),
  ]);
  // Bảng lỗi thì coi như chưa có số — trận nằm ở "chờ tỷ số", không chấm bừa.
  const tuFixtures = (fx.error ? [] : fx.data ?? []) as {
    home_team_name: string; away_team_name: string; kickoff_utc: string; home_score: number; away_score: number;
  }[];
  const tuLive = (live.error ? [] : live.data ?? []) as {
    home_team: string; away_team: string; kickoff_utc: string; home_score: number; away_score: number;
  }[];
  // fixtures đứng trước: timTySo lấy dòng gần giờ đá nhất, hoà thì giữ thứ tự này.
  return [
    ...tuFixtures.map((r) => ({ home: r.home_team_name, away: r.away_team_name, kickoff_utc: r.kickoff_utc, home_score: r.home_score, away_score: r.away_score })),
    ...tuLive.map((r) => ({ home: r.home_team, away: r.away_team, kickoff_utc: r.kickoff_utc, home_score: r.home_score, away_score: r.away_score })),
  ];
}

const getTySoThat = unstable_cache(getTySoThatImpl, ["du-doan-ty-so-that"], { revalidate: 600 });

const ngayLech = (iso: string, ngay: number) => new Date(Date.parse(iso) + ngay * 86_400_000).toISOString();

/** Mục của MỘT bài (ô dự đoán đầu bài): chỉ kéo tỷ số quanh giờ đá của trận đó. */
export async function getMucMotBai(b: AnalysisArticle): Promise<MucDuDoan> {
  const ko = duDoanCua(b)?.kickoff_utc;
  const now = Date.now();
  const tySo = ko && Date.parse(ko) < now ? await getTySoThat(ngayLech(ko, -2), ngayLech(ko, 2)).catch(() => []) : [];
  return dungMuc(b, tySo, now);
}

/** Mọi bài dự đoán (cho ô "Chọn trận khác"); lỗi nguồn → rỗng, ô tự ẩn. */
export function getBaiDuDoan(): Promise<AnalysisArticle[]> {
  return getAnalysisArticles(undefined, TRAN_BAI)
    .then((ds) => ds.filter(laBaiDuDoan))
    .catch(() => []);
}

export async function getMucDuDoan(): Promise<MucDuDoan[]> {
  const bai = (await getAnalysisArticles(undefined, TRAN_BAI)).filter(laBaiDuDoan);
  const now = Date.now();

  const daDa = bai
    .map((b) => duDoanCua(b)?.kickoff_utc)
    .filter((k): k is string => Boolean(k) && Date.parse(k as string) < now)
    .sort();
  const tySo = daDa.length > 0
    ? await getTySoThat(ngayLech(daDa[0], -2), ngayLech(daDa[daDa.length - 1], 2))
    : [];

  const muc = bai.map((b) => dungMuc(b, tySo, now));

  // Trận sắp đá lên đầu (gần giờ đá nhất trước), còn lại bài mới nhất trước.
  const sap = muc.filter((m) => m.sapDa).sort((a, b) => (a.kickoffUtc ?? "").localeCompare(b.kickoffUtc ?? ""));
  const con = muc.filter((m) => !m.sapDa);
  return [...sap, ...con];
}
