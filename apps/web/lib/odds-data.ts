import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";

/**
 * Trang Kèo (Nick 23/8): hiển thị kèo Bet365 hiện tại + kèo đã chạy thế nào từ
 * lúc mở tới giờ. Nguồn dữ liệu: bảng odds_snapshots (worker ghi mỗi 3 tiếng,
 * xem apps/worker/src/odds-collect.ts). Trang này CHỈ HIỂN THỊ số liệu tham
 * khảo — không có nút đăng ký/khuyến mãi nhà cái, không dẫn link cá cược
 * (ranh giới đã chốt cùng lúc bật tính năng, giữ đúng giọng "nhận định" của /pick).
 */

interface OddsSnapshotRow {
  event_id: number;
  competition_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  bookmaker: string;
  market: string;
  hdp: number | null;
  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;
  over_odds: number | null;
  under_odds: number | null;
  captured_at: string;
}

/** Xác suất thực sau khi bóc phần nhà cái giữ lại (đồng bộ với apps/worker/src/odds-collect.ts). */
export function trueProbabilities(
  home: number | null,
  draw: number | null,
  away: number | null,
): { home: number; draw: number; away: number; margin: number } | null {
  if (!home || !draw || !away || home <= 1 || draw <= 1 || away <= 1) return null;
  const raw = [1 / home, 1 / draw, 1 / away];
  const total = raw[0] + raw[1] + raw[2];
  if (total <= 0) return null;
  return {
    home: raw[0] / total,
    draw: raw[1] / total,
    away: raw[2] / total,
    margin: total - 1,
  };
}

export interface MarketLine {
  hdp: number | null;
  /** Lát cắt sớm nhất (kèo mở) và mới nhất (kèo hiện tại) cho đúng mức chấp này. */
  open: OddsSnapshotRow;
  current: OddsSnapshotRow;
}

export interface OddsBoardMatch {
  eventId: number;
  competitionId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  /** Mỗi loại kèo → các mức chấp/tài-xỉu khác nhau, sắp theo hdp. */
  markets: Record<string, MarketLine[]>;
  trueProb: ReturnType<typeof trueProbabilities>;
  snapshotCount: number;
}

const LEAGUE_LABEL: Record<string, string> = {
  "epl-2026": "Ngoại hạng Anh",
  "laliga-2026": "La Liga",
  "seriea-2026": "Serie A",
  "bundesliga-2026": "Bundesliga",
  "ligue1-2026": "Ligue 1",
};

export function leagueLabelForCompetition(competitionId: string): string {
  return LEAGUE_LABEL[competitionId] ?? competitionId;
}

async function getOddsBoardImpl(): Promise<OddsBoardMatch[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + 4 * 24 * 3_600_000).toISOString();

  // Supabase trả tối đa 1000 dòng mỗi lần gọi và KHÔNG báo là đã cắt bớt.
  // Cửa sổ 4 ngày đã hơn 4000 dòng (Jane đo thật 24/8), và job ghi thêm mỗi 3
  // tiếng nên con số chỉ tăng — đặt một mức trần cao hơn chỉ dời ngày hỏng lại.
  // Lấy theo từng trang tới khi hết thì không bao giờ mất dòng.
  const TRANG = 1000;
  const rows: OddsSnapshotRow[] = [];
  for (let tu = 0; ; tu += TRANG) {
    const { data, error } = await supabase
      .from("odds_snapshots")
      .select("*")
      .gte("kickoff_utc", now)
      .lte("kickoff_utc", horizon)
      .order("captured_at", { ascending: true })
      .order("id", { ascending: true })
      .range(tu, tu + TRANG - 1);
    if (error) throw new Error(`getOddsBoard: ${error.message}`);
    const lo = (data ?? []) as OddsSnapshotRow[];
    rows.push(...lo);
    if (lo.length < TRANG) break;
    if (tu > 100_000) break; // chặn vòng lặp chạy hoang, không phải giới hạn dữ liệu
  }
  if (rows.length === 0) return [];

  // event_id -> rows
  const byEvent = new Map<number, OddsSnapshotRow[]>();
  for (const r of rows) {
    const list = byEvent.get(r.event_id) ?? [];
    list.push(r);
    byEvent.set(r.event_id, list);
  }

  const matches: OddsBoardMatch[] = [];
  for (const [eventId, eventRows] of byEvent) {
    // (market, hdp) -> rows sorted by captured_at asc (already globally sorted asc above)
    const byLine = new Map<string, OddsSnapshotRow[]>();
    for (const r of eventRows) {
      const key = `${r.market}|${r.hdp ?? "null"}`;
      const list = byLine.get(key) ?? [];
      list.push(r);
      byLine.set(key, list);
    }

    const markets: Record<string, MarketLine[]> = {};
    for (const [key, lineRows] of byLine) {
      const [market] = key.split("|");
      const open = lineRows[0];
      const current = lineRows[lineRows.length - 1];
      markets[market] ??= [];
      markets[market].push({ hdp: current.hdp, open, current });
    }
    for (const market of Object.keys(markets)) {
      markets[market].sort((a, b) => (a.hdp ?? 0) - (b.hdp ?? 0));
    }

    const mlCurrent = markets.ML?.[0]?.current;
    const trueProb = mlCurrent
      ? trueProbabilities(mlCurrent.home_odds, mlCurrent.draw_odds, mlCurrent.away_odds)
      : null;

    const first = eventRows[0];
    matches.push({
      eventId,
      competitionId: first.competition_id,
      homeTeam: first.home_team,
      awayTeam: first.away_team,
      kickoffUtc: first.kickoff_utc,
      markets,
      trueProb,
      snapshotCount: new Set(eventRows.map((r) => r.captured_at)).size,
    });
  }

  matches.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  return matches;
}

export const getOddsBoard = unstable_cache(getOddsBoardImpl, ["odds-board"], {
  revalidate: 900,
  tags: ["odds"],
});
