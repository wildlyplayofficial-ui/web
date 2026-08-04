import type { MetadataRoute } from "next";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllMatchSlugs, getAllPickRefs, getAllPostSlugs, getAllGuideSlugs, getAllReportSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";
import { getStandingsCompetitions } from "@/lib/standings-extra";

/** SEO: every settled play + published post + all 4 language variants. */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = "https://www.wildlyplay.com";
const LANGS = ["en", "vi", "th", "es"] as const;

// Ngày reposition VI-legal (28/7/2026) — set lastModified cho trang static/hub để
// Google biết nội dung vừa đổi và re-crawl bản VI mới sớm (trước chỉ có changeFrequency).
const VI_REPOSITION = new Date("2026-07-28");

/** Build alternates map for hreflang in sitemap — path-based URLs. */
function alternates(path: string, langs: readonly string[] = LANGS): MetadataRoute.Sitemap[number]["alternates"] {
  const clean = path === "/" ? "" : path;
  return {
    languages: Object.fromEntries(
      langs.map((l) => [l, l === "en" ? `${BASE}${clean || "/"}` : `${BASE}/${l}${clean}`]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [picks, posts, matches, guides, reports, competitions, deskArticles] = await Promise.all([getAllPickRefs(), getAllPostSlugs(), getAllMatchSlugs(), getAllGuideSlugs(), getAllReportSlugs(), getStandingsCompetitions(), getAllAnalysisArticleSlugs()]);

  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: BASE, changeFrequency: "daily", priority: 1, alternates: alternates("/") },
    { url: `${BASE}/daily-board`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-board") },
    { url: `${BASE}/daily-line`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-line") },
    { url: `${BASE}/daily-line/leaderboard`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/daily-line/leaderboard") },
    { url: `${BASE}/daily-line/archive`, changeFrequency: "daily", priority: 0.6, alternates: alternates("/daily-line/archive") },
    { url: `${BASE}/track-record`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/track-record") },
    { url: `${BASE}/learn`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/learn") },
    { url: `${BASE}/archive`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/archive") },
    { url: `${BASE}/stats`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/stats") },
    { url: `${BASE}/matches`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/matches") },
    { url: `${BASE}/competitions`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/competitions") },
    { url: `${BASE}/calculators`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators") },
    { url: `${BASE}/calculators/odds-converter`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/odds-converter") },
    { url: `${BASE}/calculators/kelly`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/kelly") },
    { url: `${BASE}/calculators/de-vig`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/de-vig") },
    { url: `${BASE}/analysis`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/analysis") },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/guides") },
    { url: `${BASE}/transparency`, changeFrequency: "monthly", priority: 0.7, alternates: alternates("/transparency") },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8, alternates: alternates("/about") },
    { url: `${BASE}/responsible-play`, changeFrequency: "monthly", priority: 0.3, alternates: alternates("/responsible-play") },
  ] as MetadataRoute.Sitemap).map((r) => ({ ...r, lastModified: VI_REPOSITION }));

  const playRoutes: MetadataRoute.Sitemap = picks.map((p) => ({
    url: `${BASE}/play/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: alternates(`/play/${p.slug}`),
  }));

  const newsRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/analysis/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: alternates(`/analysis/${p.slug}`),
  }));

  const matchRoutes: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${BASE}/match/${m.slug}`,
    lastModified: new Date(m.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/match/${m.slug}`),
  }));

  // Guide: chỉ 6 bài nặng thuật ngữ cá cược mới loại 'vi' khỏi hreflang sitemap.
  // Các guide còn lại khai đủ 4 ngôn ngữ. (Nick chốt danh sách 4/8)
  const langsWithoutVi = LANGS.filter((l) => l !== "vi");
  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE}/guides/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(
      `/guides/${g.slug}`,
      VI_BLOCKED_GUIDE_SLUGS.has(g.slug) ? langsWithoutVi : LANGS,
    ),
  }));

  const reportRoutes: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${BASE}/transparency/${r.slug}`,
    lastModified: new Date(r.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(`/transparency/${r.slug}`),
  }));

  const deskRoutes: MetadataRoute.Sitemap = deskArticles.map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: new Date(a.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/analysis/${a.slug}`),
  }));

  const standingsRoutes: MetadataRoute.Sitemap = competitions
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${BASE}/competitions/${c.slug}`,
      lastModified: VI_REPOSITION,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: alternates(`/competitions/${c.slug}`),
    }));

  return [...staticRoutes, ...playRoutes, ...newsRoutes, ...deskRoutes, ...guideRoutes, ...reportRoutes, ...matchRoutes, ...standingsRoutes];
}
