import type { MetadataRoute } from "next";
import { getAllPickRefs, getAllPostSlugs } from "@/lib/data";

/** SEO foundation: every settled play + every published post is a permanent public page. */

export const revalidate = 3600;

const BASE = "https://www.wildlyplay.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [picks, posts] = await Promise.all([getAllPickRefs(), getAllPostSlugs()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/archive`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/stats`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/news`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/donate`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/responsible-play`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const playRoutes: MetadataRoute.Sitemap = picks.map((p) => ({
    url: `${BASE}/play/${p.id}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const newsRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...playRoutes, ...newsRoutes];
}
