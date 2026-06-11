import { getSupabase } from "./supabase";
import { mockFlags, mockPicks, mockPosts } from "./mock";
import type { Lang } from "./i18n";
import type { Pick, Post, TrackRecord } from "./types";

/**
 * Data layer. Every function queries Supabase when configured and falls back
 * to typed mock data when NEXT_PUBLIC_SUPABASE_* env vars are missing
 * (the Supabase project does not exist yet).
 */

const SETTLED = ["won", "lost", "push"] as const;

function utcDayRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Picks kicking off today (UTC), any non-draft status. Zero results is normal (decision #11). */
export async function getTodaysPicks(): Promise<Pick[]> {
  const { start, end } = utcDayRange(new Date());
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks
      .filter((p) => p.kickoff_utc >= start && p.kickoff_utc < end)
      .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  }
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .gte("kickoff_utc", start)
    .lt("kickoff_utc", end)
    .neq("status", "draft")
    .order("kickoff_utc", { ascending: true });
  if (error) throw new Error(`getTodaysPicks: ${error.message}`);
  return (data ?? []) as Pick[];
}

/** Settled picks (won/lost/push), newest first. Optional `month` filter: "YYYY-MM". */
export async function getSettledPicks(month?: string): Promise<Pick[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks
      .filter((p) => (SETTLED as readonly string[]).includes(p.status))
      .filter((p) => !month || p.kickoff_utc.startsWith(month))
      .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
  }
  let query = supabase
    .from("picks")
    .select("*")
    .in("status", [...SETTLED])
    .order("kickoff_utc", { ascending: false });
  if (month) {
    const start = `${month}-01T00:00:00Z`;
    const [y, m] = month.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1)).toISOString();
    query = query.gte("kickoff_utc", start).lt("kickoff_utc", next);
  }
  const { data, error } = await query;
  if (error) throw new Error(`getSettledPicks: ${error.message}`);
  return (data ?? []) as Pick[];
}

/** W-L-P + real units P/L (mirrors the `track_record` view). */
export async function getTrackRecord(): Promise<TrackRecord> {
  const supabase = getSupabase();
  if (!supabase) {
    const settled = mockPicks.filter((p) => (SETTLED as readonly string[]).includes(p.status));
    return {
      wins: settled.filter((p) => p.status === "won").length,
      losses: settled.filter((p) => p.status === "lost").length,
      pushes: settled.filter((p) => p.status === "push").length,
      units_pl: Math.round(settled.reduce((sum, p) => sum + (p.units_pl ?? 0), 0) * 100) / 100,
      settled: settled.length,
    };
  }
  const { data, error } = await supabase.from("track_record").select("*").single();
  if (error) throw new Error(`getTrackRecord: ${error.message}`);
  return data as TrackRecord;
}

/** Published posts for a language, newest first. Falls back to EN when a VI version is missing. */
export async function getPosts(lang: Lang): Promise<Post[]> {
  const supabase = getSupabase();
  let all: Post[];
  if (!supabase) {
    all = mockPosts;
  } else {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .in("lang", ["en", lang])
      .order("published_at", { ascending: false });
    if (error) throw new Error(`getPosts: ${error.message}`);
    all = (data ?? []) as Post[];
  }
  const bySlug = new Map<string, Post>();
  for (const post of all.filter((p) => p.status === "published")) {
    const existing = bySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") bySlug.set(post.slug, post);
    }
  }
  return [...bySlug.values()].sort((a, b) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? ""),
  );
}

/** Single published post by slug; prefers `lang`, falls back to EN. */
export async function getPost(slug: string, lang: Lang): Promise<Post | null> {
  const supabase = getSupabase();
  let candidates: Post[];
  if (!supabase) {
    candidates = mockPosts.filter((p) => p.slug === slug);
  } else {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published");
    if (error) throw new Error(`getPost: ${error.message}`);
    candidates = (data ?? []) as Post[];
  }
  return candidates.find((p) => p.lang === lang) ?? candidates.find((p) => p.lang === "en") ?? null;
}

/** Feature flag lookup — forum ships dark until ~200 daily visitors (decision #4). */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return mockFlags[key] ?? false;
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`isFeatureEnabled: ${error.message}`);
  return data?.enabled ?? false;
}

/** Distinct "YYYY-MM" months present among settled picks (for the archive filter). */
export async function getArchiveMonths(): Promise<string[]> {
  const picks = await getSettledPicks();
  const months = new Set(picks.map((p) => p.kickoff_utc.slice(0, 7)));
  return [...months].sort().reverse();
}
