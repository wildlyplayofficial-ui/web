import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/goalline/supabase";

/**
 * GET /api/goalline/group-leaderboard — Group leaderboard for Daily Line TMA.
 *
 * Query params:
 *   groupId: uuid (required) — the gl_groups.id
 *   type: "weekly" | "alltime" (default "weekly")
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ entries: [] }, { status: 503 });
  }

  const groupId = request.nextUrl.searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "weekly";

  // Get member user_ids for this group
  const { data: members } = await supabase
    .from("gl_group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (!members || members.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const userIds = members.map((m: { user_id: string }) => m.user_id);

  if (type === "weekly") {
    // Compute current week boundaries (Mon-Sun UTC)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: entries } = await supabase
      .from("gl_weekly_leaderboard")
      .select("user_id, score, winning_days, current_streak, rank, gl_users!inner(display_name, discriminator)")
      .eq("week_start_utc", weekStartStr)
      .in("user_id", userIds)
      .order("rank", { ascending: true });

    return NextResponse.json({ entries: entries ?? [] });
  }

  // alltime: aggregate from gl_picks for group members
  const { data: allPicks } = await supabase
    .from("gl_picks")
    .select("user_id, points_added, status, gl_users!inner(display_name, discriminator)")
    .in("user_id", userIds)
    .in("status", ["won", "lost"]);

  if (!allPicks?.length) {
    return NextResponse.json({ entries: [] });
  }

  const byUser = new Map<string, { userId: string; score: number; displayName: string; discriminator: string; wins: number; picks: number }>();
  for (const row of allPicks as unknown as { user_id: string; points_added: number | null; status: string; gl_users: { display_name: string; discriminator: string } | { display_name: string; discriminator: string }[] }[]) {
    const ui = Array.isArray(row.gl_users) ? row.gl_users[0] : row.gl_users;
    const existing = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      score: 0,
      displayName: ui?.display_name ?? "Anonymous",
      discriminator: ui?.discriminator ?? "",
      wins: 0,
      picks: 0,
    };
    existing.score += row.points_added ?? 0;
    existing.picks += 1;
    if (row.status === "won") existing.wins += 1;
    byUser.set(row.user_id, existing);
  }

  const entries = [...byUser.values()]
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1, score: Math.round(e.score * 100) / 100 }));

  return NextResponse.json({ entries });
}
