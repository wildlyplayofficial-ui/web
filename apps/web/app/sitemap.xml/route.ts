import { SITE_URL } from "@/lib/brand";
import { NHOM_SITEMAP } from "@/lib/chi-muc";

/**
 * GET /sitemap.xml — MỤC LỤC sitemap (12/11/2026). app/sitemap.ts dùng generateSitemaps
 * nên Next chỉ phát /sitemap/{id}.xml, KHÔNG tự sinh mục lục; robots.txt vẫn trỏ
 * /sitemap.xml nên dựng mục lục ở đây. Không khai lastmod: không có ngày thật.
 */

export const dynamic = "force-static";

export function GET(): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${NHOM_SITEMAP.map((id) => `  <sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
