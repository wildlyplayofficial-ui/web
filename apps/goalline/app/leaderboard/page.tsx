import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { S } from "@/lib/strings";
import { LeaderboardTabs } from "./leaderboard-tabs";

export const metadata: Metadata = {
  title: S.LEADERBOARD_TITLE,
};

export const revalidate = 120;

interface WeeklyEntry {
  user_id: string;
  display_name: string;
  discriminator: string;
  score: number;
  winning_days: number;
  current_streak: number;
  rank: number;
}

async function getWeeklyLeaderboard(): Promise<WeeklyEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Current week Mon-Sun UTC
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("gl_weekly_leaderboard")
    .select("user_id, display_name, discriminator, score, winning_days, current_streak, rank")
    .gte("week_start_utc", weekStart.toISOString())
    .lte("week_end_utc", weekEnd.toISOString())
    .order("rank", { ascending: true })
    .limit(50);

  return (data as WeeklyEntry[]) ?? [];
}

export default async function LeaderboardPage() {
  const entries = await getWeeklyLeaderboard();

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {S.LEADERBOARD_TITLE}
      </h1>
      <LeaderboardTabs entries={entries} />
    </div>
  );
}
