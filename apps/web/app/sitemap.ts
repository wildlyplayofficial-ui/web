import type { MetadataRoute } from "next";
import { getAllMatchSlugs, getAllPickRefs, getAllPostSlugs, getAllGuideSlugs, getAllReportSlugs } from "@/lib/data";
import { getStandingsCompetitions } from "@/lib/standings-extra";

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
  const [picks, posts, matches, guides, reports, competitions] = await Promise.all([getAllPickRefs(), getAllPostSlugs(), getAllMatchSlugs(), getAllGuideSlugs(), getAllReportSlugs(), getStandingsCompetitions()]);

  const staticRoutes: MetadataRoute.Sitemap = [
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

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE}/guides/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(`/guides/${g.slug}`),
  }));

  const reportRoutes: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${BASE}/transparency/${r.slug}`,
    lastModified: new Date(r.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(`/transparency/${r.slug}`),
  }));

  const standingsRoutes: MetadataRoute.Sitemap = competitions
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${BASE}/competitions/${c.slug}`,
      changeFrequency: "daily",
      priority: 0.7,
      alternates: alternates(`/competitions/${c.slug}`),
    }));

  return [...staticRoutes, ...playRoutes, ...newsRoutes, ...guideRoutes, ...reportRoutes, ...matchRoutes, ...standingsRoutes];
}
