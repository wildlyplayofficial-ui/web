import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import type { Lang } from "./i18n";

/** Canonical news type list — single source of truth (worker/generator must use these values). */
export const NEWS_TYPES = ["preview", "result", "standings", "transfer", "general"] as const;
export type NewsType = (typeof NEWS_TYPES)[number];

export interface NewsItem {
  id: string;
  slug: string;
  type: NewsType;
  headline_en: string;
  headline_vi: string | null;
  headline_th: string | null;
  headline_es: string | null;
  body_en: string | null;
  body_vi: string | null;
  body_th: string | null;
  body_es: string | null;
  competition_id: string | null;
  match_id: string | null;
  pick_id: string | null;
  source: string | null;
  byline: string;
  hero_card_url: string | null;
  published_at: string;
  status: string;
  created_at: string;
  /** Slug các đội bài này nhắc tới, khớp TEAM_HUBS. Dùng để dẫn về hub /doi/<clb>. */
  teams: string[] | null;
}

export function getHeadline(item: NewsItem, lang: Lang): string {
  const key = `headline_${lang}` as keyof NewsItem;
  return (item[key] as string) || item.headline_en;
}

export function getBody(item: NewsItem, lang: Lang): string | null {
  const key = `body_${lang}` as keyof NewsItem;
  return (item[key] as string | null) || item.body_en;
}

async function getNewsItemsImpl(
  competitionId?: string,
  limit = 30,
): Promise<NewsItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("news_items")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (competitionId) {
    query = query.eq("competition_id", competitionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getNewsItems: ${error.message}`);
  return (data ?? []) as NewsItem[];
}

export const getNewsItems = unstable_cache(
  getNewsItemsImpl,
  ["news-items"],
  { revalidate: 300, tags: ["news"] },
);

/** Every published news_item slug + date + headline — for the sitemap. No limit:
 *  getNewsItems caps at 30, so it can't be reused or older articles fall out.
 *  Includes the real headline (title) so the Google News sitemap doesn't fall
 *  back to the raw slug ("romero roi tottenham..." with no diacritics). */
async function getAllNewsItemSlugsImpl(): Promise<{ slug: string; updated: string; title: string }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("news_items")
    .select("slug, published_at, headline_vi, headline_en")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`getAllNewsItemSlugs: ${error.message}`);
  return (data ?? []).map((r) => ({
    slug: r.slug as string,
    updated: (r.published_at as string) ?? "",
    // Tiêu đề tiếng Việt trước — news-sitemap khai news:language=vi nên đưa
    // tiêu đề tiếng Anh vào là tự mâu thuẫn. Rơi về en rồi slug nếu thiếu.
    title: (r.headline_vi as string) || (r.headline_en as string) || (r.slug as string),
  }));
}

export const getAllNewsItemSlugs = unstable_cache(
  getAllNewsItemSlugsImpl,
  ["news-item-slugs"],
  { revalidate: 300, tags: ["news"] },
);

async function getNewsItemBySlugImpl(slug: string): Promise<NewsItem | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`getNewsItemBySlug: ${error.message}`);
  }
  return (data as NewsItem) ?? null;
}

export const getNewsItemBySlug = unstable_cache(
  getNewsItemBySlugImpl,
  ["news-item-by-slug"],
  { revalidate: 300, tags: ["news"] },
);

/** Fetch kickoff_utc by livescore match id. Tries fixtures first (available from ingest,
 *  covers T-24h previews before match_live_state populates), then match_live_state. */
async function getKickoffByMatchIdImpl(matchId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: fx } = await supabase
    .from("fixtures")
    .select("kickoff_utc")
    .eq("livescore_match_id", matchId)
    .single();
  if ((fx as { kickoff_utc: string } | null)?.kickoff_utc) return fx!.kickoff_utc;
  const { data: mls } = await supabase
    .from("match_live_state")
    .select("kickoff_utc")
    .eq("id", matchId)
    .single();
  return (mls as { kickoff_utc: string } | null)?.kickoff_utc ?? null;
}

export const getKickoffByMatchId = unstable_cache(
  getKickoffByMatchIdImpl,
  ["kickoff-by-match-id"],
  { revalidate: 3600 },
);

/** Bài TIN gắn nhãn 1 đội (hub /doi). Cột `teams` chưa tồn tại (trước migration) → trả rỗng. */
async function getNewsByTeamImpl(team: string, limit = 40): Promise<NewsItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .contains("teams", [team])
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42703" || error.message.includes("column")) return [];
    throw new Error(`getNewsByTeam: ${error.message}`);
  }
  return (data ?? []) as NewsItem[];
}

export const getNewsByTeam = unstable_cache(getNewsByTeamImpl, ["news-by-team"], {
  revalidate: 300,
  tags: ["news"],
});
