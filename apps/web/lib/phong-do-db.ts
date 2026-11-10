/** Đọc trận đã đá từ bảng fixtures cho ô phong độ — cache như getTySoThat (lib/du-doan). */
import { unstable_cache } from "next/cache";
import type { TranDaDa } from "./phong-do";
import { getSupabase } from "./supabase";

async function getTranDaDaImpl(doi: string[]): Promise<TranDaDa[]> {
  const supabase = getSupabase();
  if (!supabase || doi.length === 0) return [];
  const cot = "home_team_name, away_team_name, kickoff_utc, home_score, away_score";
  const keo = (cotDoi: string) =>
    supabase
      .from("fixtures")
      .select(cot)
      .in(cotDoi, doi)
      .not("home_score", "is", null)
      .not("away_score", "is", null)
      .order("kickoff_utc", { ascending: false })
      .limit(40 * doi.length);
  const [nha, khach] = await Promise.all([keo("home_team_name"), keo("away_team_name")]);
  type Dong = { home_team_name: string; away_team_name: string; kickoff_utc: string; home_score: number; away_score: number };
  // Bảng lỗi thì coi như chưa có số → không hiện ô phong độ.
  return [...(nha.error ? [] : nha.data ?? []), ...(khach.error ? [] : khach.data ?? [])].map((r: Dong) => ({
    home: r.home_team_name,
    away: r.away_team_name,
    kickoff_utc: r.kickoff_utc,
    home_score: r.home_score,
    away_score: r.away_score,
  }));
}

const getTranDaDaCache = unstable_cache(getTranDaDaImpl, ["du-doan-phong-do"], { revalidate: 600 });

/** Trận đã đá của các đội (tên GỐC tiếng Anh như bảng fixtures ghi). */
export function getTranDaDa(doi: readonly string[]): Promise<TranDaDa[]> {
  return getTranDaDaCache([...new Set(doi)].sort()).catch(() => []);
}
