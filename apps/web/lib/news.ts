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
