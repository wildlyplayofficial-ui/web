import type { MetadataRoute } from "next";
import { getAllMatchSlugs, getAllPickRefs, getAllPostSlugs, getAllGuideSlugs } from "@/lib/data";

/** SEO: every settled play + published post + all 4 language variants. */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = "https://www.wildlyplay.com";
const LANGS = ["en", "vi", "th", "es"] as const;

/** Build alternates map for hreflang in sitemap — path-based URLs. */
function alternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  const clean = path === "/" ? "" : path;
  return {
    languages: Object.fromEntries(
      LANGS.map((l) => [l, l === "en" ? `${BASE}${clean || "/"}` : `${BASE}/${l}${clean}`]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [picks, posts, matches, guides] = await Promise.all([getAllPickRefs(), getAllPostSlugs(), getAllMatchSlugs(), getAllGuideSlugs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1, alternates: alternates("/") },
    { url: `${BASE}/daily-line`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-line") },
    { url: `${BASE}/daily-line/leaderboard`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/daily-line/leaderboard") },
    { url: `${BASE}/daily-line/archive`, changeFrequency: "daily", priority: 0.6, alternates: alternates("/daily-line/archive") },
    { url: `${BASE}/archive`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/archive") },
    { url: `${BASE}/stats`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/stats") },
    { url: `${BASE}/matches`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/matches") },
    { url: `${BASE}/news`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/news") },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/guides") },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.4, alternates: alternates("/about") },
    { url: `${BASE}/responsible-play`, changeFrequency: "monthly", priority: 0.3, alternates: alternates("/responsible-play") },
  ];

  const playRoutes: MetadataRoute.Sitemap = picks.map((p) => ({
    url: `${BASE}/play/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: alternates(`/play/${p.slug}`),
  }));

  const newsRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: alternates(`/news/${p.slug}`),
  }));

  const matchRoutes: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${BASE}/match/${m.slug}`,
    lastModified: new Date(m.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/match/${m.slug}`),
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE}/guides/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(`/guides/${g.slug}`),
  }));

  return [...staticRoutes, ...playRoutes, ...newsRoutes, ...guideRoutes, ...matchRoutes];
}
