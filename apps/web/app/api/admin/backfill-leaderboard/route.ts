import { getServiceSupabase } from "@/lib/supabase-server";

/**
 * POST /api/admin/backfill-leaderboard
 * One-off: populate gl_weekly_leaderboard from all existing settled picks.
 * Protected by REVALIDATE_SECRET.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceSupabase();
  if (!sb) return Response.json({ error: "DB not configured" }, { status: 500 });

  // Get all settled picks with card dates
  const { data: picks, error } = await sb
    .from("gl_picks")
    .select(`
      user_id,
      status,
      points_added,
      daily_card_id,
      gl_daily_cards!inner (utc_date)
    `)
    .in("status", ["won", "lost"]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!picks || picks.length === 0) return Response.json({ message: "No settled picks", rows: 0 });

  interface PickRow {
    user_id: string;
    status: string;
    points_added: number | null;
    daily_card_id: string;
    gl_daily_cards: { utc_date: string } | { utc_date: string }[];
  }

  // Group by week
  function getWeekBounds(dateStr: string): { start: string; end: string } {
    const d = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = d.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() + mondayOffset);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
  }

  // Key: "userId|weekStart"
  const weekUserStats = new Map<string, {
    user_id: string;
    week_start: string;
    week_end: string;
    score: number;
    winDays: Set<string>;
    participationDays: Set<string>;
  }>();

  for (const row of picks as unknown as PickRow[]) {
    const cardInfo = Array.isArray(row.gl_daily_cards) ? row.gl_daily_cards[0] : row.gl_daily_cards;
    const utcDate = cardInfo?.utc_date ?? "";
    if (!utcDate) continue;

    const { start, end } = getWeekBounds(utcDate);
    const key = `${row.user_id}|${start}`;

    const existing = weekUserStats.get(key) ?? {
      user_id: row.user_id,
      week_start: start,
      week_end: end,
      score: 0,
      winDays: new Set<string>(),
      participationDays: new Set<string>(),
    };

    existing.score += row.points_added ?? 0;
    existing.participationDays.add(utcDate);
    if (row.status === "won") existing.winDays.add(utcDate);
    weekUserStats.set(key, existing);
  }

  // Group entries by week for ranking
  const weekGroups = new Map<string, typeof entries>();
  type EntryType = {
    user_id: string;
    week_start_utc: string;
    week_end_utc: string;
    score: number;
    winning_days: number;
    participation_days: number;
    current_streak: number;
    rank: number;
  };
  const entries: EntryType[] = [];

  for (const stats of weekUserStats.values()) {
    const entry: EntryType = {
      user_id: stats.user_id,
      week_start_utc: stats.week_start,
      week_end_utc: stats.week_end,
      score: Math.round(stats.score * 100) / 100,
      winning_days: stats.winDays.size,
      participation_days: stats.participationDays.size,
      current_streak: stats.participationDays.size, // simplified for backfill
      rank: 0,
    };
    entries.push(entry);

    const group = weekGroups.get(stats.week_start) ?? [];
    group.push(entry);
    weekGroups.set(stats.week_start, group);
  }

  // Assign ranks per week
  for (const group of weekGroups.values()) {
    group.sort((a, b) => b.score - a.score);
    group.forEach((e, i) => { e.rank = i + 1; });
  }

  // Upsert all
  let upserted = 0;
  for (const entry of entries) {
    const { error: upsertErr } = await sb
      .from("gl_weekly_leaderboard")
      .upsert(entry, { onConflict: "user_id,week_start_utc" });
    if (!upsertErr) upserted++;
  }

  return Response.json({ message: "Backfill complete", upserted, total: entries.length });
}
