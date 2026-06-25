import type { Metadata } from "next";
import { getSupabase } from "@/lib/goalline/supabase";
import { S, getDailyLineDict } from "@/lib/goalline/strings";
import { resolveLang } from "@/lib/i18n";
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
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("gl_weekly_leaderboard")
    .select("user_id, score, winning_days, current_streak, rank, gl_users!inner(display_name, discriminator)")
    .eq("week_start_utc", weekStartStr)
    .order("rank", { ascending: true })
    .limit(20);

  if (!data) return [];

  interface RawRow {
    user_id: string;
    score: number;
    winning_days: number;
    current_streak: number;
    rank: number;
    gl_users: { display_name: string; discriminator: string } | { display_name: string; discriminator: string }[];
  }

  return (data as unknown as RawRow[]).map((row) => {
    const userInfo = Array.isArray(row.gl_users) ? row.gl_users[0] : row.gl_users;
    return {
      user_id: row.user_id,
      display_name: userInfo?.display_name ?? "Anonymous",
      discriminator: userInfo?.discriminator ?? "0000",
      score: row.score,
      winning_days: row.winning_days,
      current_streak: row.current_streak,
      rank: row.rank,
    };
  });
}

const WEEK_PREFIX: Record<string, string> = {
  en: "Week of",
  vi: "Tu\u1EA7n",
  th: "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C",
  es: "Semana del",
};

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  vi: "vi-VN",
  th: "th-TH",
  es: "es-ES",
};

function currentWeekLabel(lang = "en"): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() + mondayOffset);
  mon.setUTCHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);

  const locale = LOCALE_MAP[lang] ?? "en-US";
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const year = sun.getUTCFullYear();
  const prefix = WEEK_PREFIX[lang] ?? WEEK_PREFIX.en;
  return `${prefix} ${fmt(mon)}\u2013${fmt(sun)}, ${year}`;
}

interface AllTimeEntry {
  user_id: string;
  display_name: string;
  discriminator: string;
  total_score: number;
  picks_count: number;
  wins: number;
}

async function getAllTimeLeaderboard(): Promise<AllTimeEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("gl_picks")
    .select(`
      user_id,
      status,
      points_added,
      gl_users!inner (display_name, discriminator)
    `)
    .in("status", ["won", "lost"]);

  if (!data?.length) return [];

  interface RawRow {
    user_id: string;
    status: string;
    points_added: number | null;
    gl_users: { display_name: string; discriminator: string } | { display_name: string; discriminator: string }[];
  }

  const byUser = new Map<string, AllTimeEntry>();
  for (const row of data as unknown as RawRow[]) {
    const userInfo = Array.isArray(row.gl_users) ? row.gl_users[0] : row.gl_users;
    if (!userInfo) continue;

    const existing = byUser.get(row.user_id) ?? {
      user_id: row.user_id,
      display_name: userInfo.display_name ?? "Anonymous",
      discriminator: userInfo.discriminator ?? "0000",
      total_score: 0,
      picks_count: 0,
      wins: 0,
    };
    existing.picks_count++;
    existing.total_score += row.points_added ?? 0;
    if (row.status === "won") existing.wins++;
    byUser.set(row.user_id, existing);
  }

  return [...byUser.values()]
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 20);
}

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaderboardPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDailyLineDict(lang);
  const [weeklyEntries, allTimeEntries] = await Promise.all([
    getWeeklyLeaderboard(),
    getAllTimeLeaderboard(),
  ]);

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {dict.LEADERBOARD_TITLE}
      </h1>
      <p className="mt-1 text-sm text-muted">{currentWeekLabel(lang)}</p>
      <LeaderboardTabs entries={weeklyEntries} allTime={allTimeEntries} lang={lang} />
    </div>
  );
}
