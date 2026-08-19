import { getPost } from "@/lib/data";
import { getNewsItemBySlug } from "@/lib/news";
import { OgCard, ogResponse, loadMarkDataUri } from "../../_shared";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * FALLBACK card: pages prefer a hero_image, so keep it branded/generic-title
 * (headline + kind). Fallback chain: posts table → news_items table → 404.
 */

const TYPE_STATUS: Record<string, string> = {
  preview: "PREVIEW",
  result: "RESULT",
  standings: "STANDINGS",
  recap: "RECAP",
  analysis: "ANALYSIS",
  news: "NEWS",
  transfer: "TRANSFER",
  "no-play": "NO PLAY",
  "post-mortem": "POST-MORTEM",
  guide: "GUIDE",
};

async function card(headline: string, type: string, headers: Record<string, string>): Promise<Response> {
  const label = TYPE_STATUS[type] ?? type.toUpperCase();
  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow={label}
      title={headline}
      footer="banhbong.net"
      footerRight="banhbong.net News"
    />,
    { headers },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };

  const post = await getPost(slug, "en");
  if (post) {
    return card(post.meta_title ?? post.title, post.type, headers);
  }

  // Fallback: news_items table (auto-gen preview/result/standings)
  const newsItem = await getNewsItemBySlug(slug);
  if (!newsItem) return new Response("Not found", { status: 404 });

  return card(newsItem.headline_en, newsItem.type, headers);
}
