import { getAllPostSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs } from "@/lib/news";
import { SITE_URL, SITE_NAME } from "@/lib/brand";

/**
 * GET /news-sitemap.xml — Google News sitemap for recent articles.
 * Only includes articles from the last 48 hours (Google News requirement).
 * Covers /analysis/ (posts + desk articles) AND /news/ (news_items).
 */

const BASE = SITE_URL;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [posts, deskArticles, newsItems] = await Promise.all([
    getAllPostSlugs(),
    getAllAnalysisArticleSlugs(),
    getAllNewsItemSlugs(),
  ]);

  // Google News: only articles from last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const allItems = [
    ...posts.map((p) => ({ path: "analysis", slug: p.slug, title: p.title, updated: p.updated })),
    ...deskArticles.map((a) => ({ path: "analysis", slug: a.slug, title: a.title, updated: a.updated })),
    // news_items live at /news/, not /analysis/. Use the real headline (not the
    // slug) so Google News shows a proper title, not "romero roi tottenham...".
    ...newsItems.map((n) => ({ path: "news", slug: n.slug, title: n.title, updated: n.updated })),
  ];

  const recent = allItems.filter((p) => p.updated && new Date(p.updated) >= cutoff);

  const urls = recent.map(
    (p) => `  <url>
    <loc>${BASE}/${p.path}/${p.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
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
