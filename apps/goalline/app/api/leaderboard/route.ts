import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/leaderboard — Weekly leaderboard.
 *
 * Query params:
 *   type: "weekly" (default) — only weekly for MVP
 *   limit: number (default 50, max 100)
 *
 * Weekly = Mon 00:00 UTC → Sun 23:59:59 UTC (spec §9).
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

  const { data: entries } = await supabase
    .from("gl_weekly_leaderboard")
    .select("user_id, display_name, discriminator, score, winning_days, current_streak, rank")
    .gte("week_start_utc", weekStart.toISOString())
    .lte("week_end_utc", weekEnd.toISOString())
    .order("rank", { ascending: true })
    .limit(limit);

  return NextResponse.json({
    entries: entries ?? [],
    week: {
      start: weekStart.toISOString().slice(0, 10),
      end: weekEnd.toISOString().slice(0, 10),
    },
  });
}
