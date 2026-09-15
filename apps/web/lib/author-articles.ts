import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";

export interface AuthorArticle {
  title: string;
  href: string;
  published_at: string;
}

/** Bài mới nhất mang byline `name` ở analysis_articles + news_items — cho trang /tac-gia. */
async function getArticlesByBylineImpl(name: string, limit = 20): Promise<AuthorArticle[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const [analysis, news] = await Promise.all([
    supabase
      .from("analysis_articles")
      .select("slug, title, published_at")
      .eq("byline", name)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit),
    supabase
      .from("news_items")
      .select("slug, headline_vi, headline_en, published_at")
      .eq("byline", name)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit),
  ]);
  if (analysis.error) throw new Error(`getArticlesByByline analysis: ${analysis.error.message}`);
  if (news.error) throw new Error(`getArticlesByByline news: ${news.error.message}`);
  return [
    ...(analysis.data ?? []).map((r) => ({
      title: r.title as string,
      href: `/analysis/${r.slug}`,
      published_at: (r.published_at as string) ?? "",
    })),
    ...(news.data ?? []).map((r) => ({
      title: (r.headline_vi as string) || (r.headline_en as string) || (r.slug as string),
      href: `/news/${r.slug}`,
      published_at: (r.published_at as string) ?? "",
    })),
  ]
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, limit);
}

export const getArticlesByByline = unstable_cache(getArticlesByBylineImpl, ["articles-by-byline"], {
  revalidate: 300,
  tags: ["analysis-articles", "news"],
});
