import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/goalline/supabase";

/**
 * GET /api/goalline/leaderboard — Weekly leaderboard.
 *
 * Query params:
 *   type: "weekly" (default) — only weekly for MVP
 *   limit: number (default 50, max 100)
 *
 * Weekly = Mon 00:00 UTC -> Sun 23:59:59 UTC (spec §9).
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ entries: [] }, { status: 503 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 100);

  // Compute current week boundaries (Mon-Sun UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("gl_weekly_leaderboard")
    .select("user_id, score, winning_days, current_streak, rank, gl_users!inner(display_name, discriminator)")
    .eq("week_start_utc", weekStartStr)
    .order("rank", { ascending: true })
    .limit(limit);

  // If userId param provided, find their rank
  const userId = request.nextUrl.searchParams.get("userId");
  let myRank: { rank: number; score: number; displayName: string; discriminator?: string; winningDays?: number; streak?: number } | null = null;
  if (userId) {
    const { data: myRow } = await supabase
      .from("gl_weekly_leaderboard")
      .select("rank, score, winning_days, current_streak, gl_users!inner(display_name, discriminator)")
      .eq("week_start_utc", weekStartStr)
      .eq("user_id", userId)
      .single();

    if (myRow) {
      const r = myRow as Record<string, unknown>;
      const userInfo = Array.isArray(r.gl_users)
        ? (r.gl_users as Array<{ display_name: string; discriminator: string }>)[0]
        : r.gl_users as { display_name: string; discriminator: string };
      myRank = {
        rank: r.rank as number,
        score: r.score as number,
        displayName: userInfo?.display_name ?? "Anonymous",
        discriminator: userInfo?.discriminator ?? "",
        winningDays: (r.winning_days as number) ?? 0,
        streak: (r.current_streak as number) ?? 0,
      };
    }
  }

  // All-time rank for the user (from gl_picks aggregate)
  let myAllTimeRank: { rank: number; score: number; displayName: string; discriminator?: string; wins?: number; picksCount?: number } | null = null;
  if (userId) {
    const { data: allPicks } = await supabase
      .from("gl_picks")
      .select("user_id, points_added, status, gl_users!inner(display_name, discriminator)")
      .in("status", ["won", "lost"]);

    if (allPicks?.length) {
      const byUser = new Map<string, { score: number; displayName: string; discriminator: string }>();
      for (const row of allPicks as unknown as { user_id: string; points_added: number | null; gl_users: { display_name: string; discriminator: string } | { display_name: string; discriminator: string }[] }[]) {
        const ui = Array.isArray(row.gl_users) ? row.gl_users[0] : row.gl_users;
        const existing = byUser.get(row.user_id) ?? { score: 0, displayName: ui?.display_name ?? "Anonymous", discriminator: ui?.discriminator ?? "" };
        existing.score += row.points_added ?? 0;
        byUser.set(row.user_id, existing);
      }
      const sorted = [...byUser.entries()].sort((a, b) => b[1].score - a[1].score);
      const idx = sorted.findIndex(([uid]) => uid === userId);
      if (idx >= 0) {
        // Count wins + picks for this user
        const userPicks = (allPicks as unknown as { user_id: string; status: string }[]).filter((r) => r.user_id === userId);
        const wins = userPicks.filter((r) => r.status === "won").length;
        myAllTimeRank = {
          rank: idx + 1,
          score: Math.round(sorted[idx][1].score * 100) / 100,
          displayName: sorted[idx][1].displayName,
          discriminator: sorted[idx][1].discriminator,
          wins,
          picksCount: userPicks.length,
        };
      }
    }
  }

  return NextResponse.json({
    entries: entries ?? [],
    myRank,
    myAllTimeRank,
    week: {
      start: weekStartStr,
      end: weekEnd.toISOString().slice(0, 10),
    },
  });
}
