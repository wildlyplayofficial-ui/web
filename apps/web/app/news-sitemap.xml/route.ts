import { getAllPostSlugs } from "@/lib/data";

/**
 * GET /news-sitemap.xml — Google News sitemap for recent articles.
 * Only includes articles from the last 48 hours (Google News requirement).
 * Auto-generated, zero maintenance.
 */

const BASE = "https://www.wildlyplay.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const posts = await getAllPostSlugs();

  // Google News: only articles from last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recent = posts.filter(
    (p) => new Date(p.updated) >= cutoff,
  );

  const urls = recent.map(
    (p) => `  <url>
    <loc>${BASE}/news/${p.slug}</loc>
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
