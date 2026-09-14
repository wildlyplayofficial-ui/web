import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import type { AnalysisArticle } from "./types";

/**
 * Data layer for Desk-authored analysis articles (spec §2A-B).
 * Reads from `analysis_articles` table. Falls back to empty array
 * when the table does not exist yet (another agent creates it).
 */

/** Published Desk articles, newest first. Optional league filter. */
async function getAnalysisArticlesImpl(
  league?: string,
  limit = 30,
): Promise<AnalysisArticle[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase
    .from("analysis_articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (league) query = query.eq("league", league);
  const { data, error } = await query;
  if (error) {
    // Table may not exist yet — graceful fallback
    if (error.code === "42P01" || error.message.includes("does not exist")) return [];
    throw new Error(`getAnalysisArticles: ${error.message}`);
  }
  return (data ?? []) as AnalysisArticle[];
}

export const getAnalysisArticles = unstable_cache(
  getAnalysisArticlesImpl,
  ["analysis-articles"],
  { revalidate: 300, tags: ["analysis-articles"] },
);

/** Single published Desk article by slug. */
async function getAnalysisArticleBySlugImpl(
  slug: string,
): Promise<AnalysisArticle | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("analysis_articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return null;
    throw new Error(`getAnalysisArticleBySlug: ${error.message}`);
  }
  return (data as AnalysisArticle) ?? null;
}

export const getAnalysisArticleBySlug = unstable_cache(
  getAnalysisArticleBySlugImpl,
  ["analysis-article-by-slug"],
  { revalidate: 300, tags: ["analysis-articles"] },
);

/** All published Desk article slugs for sitemap. */
async function getAllAnalysisArticleSlugsImpl(): Promise<
  { slug: string; updated: string; modified: string; title: string }[]
> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("analysis_articles")
    .select("slug, published_at, updated_at, title")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return [];
    throw new Error(`getAllAnalysisArticleSlugs: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    slug: r.slug,
    updated: r.published_at ?? new Date().toISOString(),
    // `updated` vẫn là ngày ĐĂNG (news-sitemap + RSS cần ngày đăng). `modified` là
    // ngày SỬA, chỉ sitemap.xml dùng: nâng cấp bài mà lastmod đứng yên ở ngày đăng
    // thì Google không có tín hiệu quay lại thu thập (đo 14/9: xem-mls kẹt ở
    // "đã thu thập – chưa lập chỉ mục", lastmod vẫn 9/8).
    modified: r.updated_at ?? r.published_at ?? new Date().toISOString(),
    title: r.title,
  }));
}

export const getAllAnalysisArticleSlugs = unstable_cache(
  getAllAnalysisArticleSlugsImpl,
  // Đổi khoá khi thêm `modified`: khoá cũ trả bản đệm thiếu trường này tới 1 giờ.
  ["analysis-article-slugs-v2"],
  { revalidate: 3600, tags: ["analysis-articles"] },
);

/** Bài NHẬN ĐỊNH gắn nhãn 1 đội (hub /doi). Cột `teams` chưa có → trả rỗng. */
async function getAnalysisByTeamImpl(team: string, limit = 40): Promise<AnalysisArticle[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("analysis_articles")
    .select("*")
    .contains("teams", [team])
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42703" || error.message.includes("column") || error.message.includes("does not exist")) return [];
    throw new Error(`getAnalysisByTeam: ${error.message}`);
  }
  return (data ?? []) as AnalysisArticle[];
}

export const getAnalysisByTeam = unstable_cache(getAnalysisByTeamImpl, ["analysis-by-team"], {
  revalidate: 300,
  tags: ["analysis-articles"],
});
