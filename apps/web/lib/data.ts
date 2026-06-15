import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import { mockFlags, mockPicks, mockPosts, mockVoteCounts } from "./mock";
import type { Lang } from "./i18n";
import type { Pick, Post, TrackRecord, VoteCounts, VoteKind } from "./types";

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
async function getTodaysPicksImpl(): Promise<Pick[]> {
  // Nick 13/6: show picks within next 24h (not just today UTC) so evening picks for tomorrow appear
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(start.getUTCHours() - 12); // include settled picks from earlier today
  const end = new Date(now);
  end.setUTCHours(end.getUTCHours() + 24); // look 24h ahead
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks
      .filter((p) => p.kickoff_utc >= startIso && p.kickoff_utc < endIso && p.status === "published")
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  }
  // Nick 14/6: hide settled picks from Board (they belong in Archive), newest first
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .gte("kickoff_utc", startIso)
    .lt("kickoff_utc", endIso)
    .neq("status", "draft")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getTodaysPicks: ${error.message}`);
  return (data ?? []) as Pick[];
}

export const getTodaysPicks = unstable_cache(getTodaysPicksImpl, ["todays-picks"], {
  revalidate: 300,
  tags: ["picks"],
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Single pick by id for the play detail page (decisions #1, #3: full transparency).
 *  RLS already hides drafts; the mock path filters them too for parity. */
async function getPickImpl(id: string): Promise<Pick | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks.find((p) => p.id === id && (p.status as string) !== "draft") ?? null;
  }
  const { data, error } = await supabase
    .from("picks")
    .select("*")
    .eq("id", id)
    .neq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(`getPick: ${error.message}`);
  return (data as Pick) ?? null;
}

export const getPick = unstable_cache(getPickImpl, ["pick"], {
  revalidate: 300,
  tags: ["picks"],
});

/** Settled picks (won/lost/push), newest first. Optional `month` filter: "YYYY-MM". */
async function getSettledPicksImpl(month?: string): Promise<Pick[]> {
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

export const getSettledPicks = unstable_cache(getSettledPicksImpl, ["settled-picks"], {
  revalidate: 900,
  tags: ["picks"],
});

/** W-L-P + real units P/L (mirrors the `track_record` view). */
async function getTrackRecordImpl(): Promise<TrackRecord> {
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

export const getTrackRecord = unstable_cache(getTrackRecordImpl, ["track-record"], {
  revalidate: 900,
  tags: ["picks"],
});

/** Published posts for a language, newest first. Falls back to EN when a VI version is missing. */
async function getPostsImpl(lang: Lang): Promise<Post[]> {
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

export const getPosts = unstable_cache(getPostsImpl, ["posts"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Single published post by slug; prefers `lang`, falls back to EN. */
async function getPostImpl(slug: string, lang: Lang): Promise<Post | null> {
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

export const getPost = unstable_cache(getPostImpl, ["post"], {
  revalidate: 300,
  tags: ["posts"],
});

/** Available languages for a post slug (M4: hreflang). */
async function getPostLangsImpl(slug: string): Promise<Lang[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPosts.filter((p) => p.slug === slug).map((p) => p.lang as Lang);
  }
  const { data, error } = await supabase
    .from("posts")
    .select("lang")
    .eq("slug", slug)
    .eq("status", "published");
  if (error) throw new Error(`getPostLangs: ${error.message}`);
  return (data ?? []).map((r) => r.lang as Lang);
}

export const getPostLangs = unstable_cache(getPostLangsImpl, ["post-langs"], {
  revalidate: 300,
  tags: ["posts"],
});

/** All published post slugs for sitemap (M4). */
async function getAllPostSlugsImpl(): Promise<{ slug: string; updated: string }[]> {
  const supabase = getSupabase();
  if (!supabase) {
    const seen = new Set<string>();
    return mockPosts.filter((p) => {
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    }).map((p) => ({ slug: p.slug, updated: p.published_at ?? new Date().toISOString() }));
  }
  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at")
    .eq("status", "published")
    .eq("lang", "en")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllPostSlugs: ${error.message}`);
  return (data ?? []).map((r) => ({ slug: r.slug, updated: r.published_at ?? new Date().toISOString() }));
}

export const getAllPostSlugs = unstable_cache(getAllPostSlugsImpl, ["post-slugs"], {
  revalidate: 3600,
  tags: ["posts"],
});

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

/** Crowd-poll tallies per pick (decision #5). Mock mode derives stable fake counts. */
async function getVoteCountsImpl(pickIds: string[]): Promise<Record<string, VoteCounts>> {
  if (pickIds.length === 0) return {};
  const counts: Record<string, VoteCounts> = Object.fromEntries(
    pickIds.map((id) => [id, { follow: 0, fade: 0, skip: 0 }]),
  );
  const supabase = getSupabase();
  if (!supabase) {
    for (const id of pickIds) counts[id] = mockVoteCounts(id);
    return counts;
  }
  const { data, error } = await supabase
    .from("pick_votes")
    .select("pick_id, vote")
    .in("pick_id", pickIds);
  if (error) throw new Error(`getVoteCounts: ${error.message}`);
  for (const row of (data ?? []) as { pick_id: string; vote: VoteKind }[]) {
    if (counts[row.pick_id]) counts[row.pick_id][row.vote] += 1;
  }
  return counts;
}

export const getVoteCounts = unstable_cache(getVoteCountsImpl, ["vote-counts"], {
  revalidate: 60,
  tags: ["votes"],
});

/** Thesis translations from `pick_content`, keyed by pick id then language.
 *  The English thesis lives on the pick itself — callers fall back to it. */
async function getThesisTranslationsImpl(
  pickIds: string[],
): Promise<Record<string, Partial<Record<Lang, string>>>> {
  if (pickIds.length === 0) return {};
  const supabase = getSupabase();
  if (!supabase) return {}; // mock mode: English thesis only
  const { data, error } = await supabase
    .from("pick_content")
    .select("pick_id, lang, body_md")
    .in("pick_id", pickIds);
  if (error) throw new Error(`getThesisTranslations: ${error.message}`);
  const map: Record<string, Partial<Record<Lang, string>>> = {};
  for (const row of (data ?? []) as { pick_id: string; lang: Lang; body_md: string }[]) {
    (map[row.pick_id] ??= {})[row.lang] = row.body_md;
  }
  return map;
}

export const getThesisTranslations = unstable_cache(
  getThesisTranslationsImpl,
  ["thesis-translations"],
  { revalidate: 300, tags: ["picks"] },
);

/** All non-draft pick ids with their last activity date — sitemap only. */
export async function getAllPickRefs(): Promise<{ id: string; updated: string }[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return mockPicks.map((p) => ({ id: p.id, updated: p.settled_at ?? p.kickoff_utc }));
  }
  const { data, error } = await supabase
    .from("picks")
    .select("id, kickoff_utc, settled_at")
    .neq("status", "draft")
    .order("kickoff_utc", { ascending: false });
  if (error) throw new Error(`getAllPickRefs: ${error.message}`);
  return ((data ?? []) as { id: string; kickoff_utc: string; settled_at: string | null }[]).map(
    (p) => ({ id: p.id, updated: p.settled_at ?? p.kickoff_utc }),
  );
}

/** Distinct "YYYY-MM" months present among settled picks (for the archive filter). */
export async function getArchiveMonths(): Promise<string[]> {
  const picks = await getSettledPicks();
  const months = new Set(picks.map((p) => p.kickoff_utc.slice(0, 7)));
  return [...months].sort().reverse();
}
