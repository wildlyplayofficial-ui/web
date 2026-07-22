import { getAllPostSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";

/**
 * GET /api/analysis/rss — RSS feed for /analysis section.
 * Merges posts and Desk-authored articles, newest first.
 * Replaces the old /news/rss.xml feed (spec section 2B).
 */

const BASE = "https://www.wildlyplay.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const [posts, deskArticles] = await Promise.all([
    getAllPostSlugs(),
    getAllAnalysisArticleSlugs(),
  ]);

  // Merge and sort by date descending
  const items = [
    ...posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      updated: p.updated,
      source: "post" as const,
    })),
    ...deskArticles.map((a) => ({
      slug: a.slug,
      title: a.title,
      updated: a.updated,
      source: "desk" as const,
    })),
  ]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, 50);

  const lastBuild = items[0]?.updated ?? new Date().toISOString();

  const rssItems = items.map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${BASE}/analysis/${item.slug}</link>
      <guid isPermaLink="true">${BASE}/analysis/${item.slug}</guid>
      <pubDate>${new Date(item.updated).toUTCString()}</pubDate>
      <dc:creator>WildlyPlay Desk</dc:creator>
    </item>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>WildlyPlay Analysis</title>
    <link>${BASE}/analysis</link>
    <description>Match analysis, previews, recaps and post-mortems from WildlyPlay.</description>
    <language>en</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/api/analysis/rss" rel="self" type="application/rss+xml"/>
${rssItems.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
