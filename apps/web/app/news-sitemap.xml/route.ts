import { getAllPostSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";

/**
 * GET /news-sitemap.xml — Google News sitemap for recent articles.
 * Only includes articles from the last 48 hours (Google News requirement).
 * Now points to /analysis/ URLs (retired /news, spec §2E).
 */

const BASE = "https://www.wildlyplay.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [posts, deskArticles] = await Promise.all([
    getAllPostSlugs(),
    getAllAnalysisArticleSlugs(),
  ]);

  // Google News: only articles from last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const allItems = [
    ...posts.map((p) => ({ slug: p.slug, title: p.title, updated: p.updated })),
    ...deskArticles.map((a) => ({ slug: a.slug, title: a.title, updated: a.updated })),
  ];

  const recent = allItems.filter((p) => new Date(p.updated) >= cutoff);

  const urls = recent.map(
    (p) => `  <url>
    <loc>${BASE}/analysis/${p.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>WildlyPlay</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(p.updated).toISOString()}</news:publication_date>
      <news:title>${escapeXml(p.title)}</news:title>
    </news:news>
    <lastmod>${new Date(p.updated).toISOString()}</lastmod>
  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
