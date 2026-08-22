import { getPost } from "@/lib/data";
import { getHeadline, getNewsItemBySlug } from "@/lib/news";
import { resolveLang, type Lang } from "@/lib/i18n";
import { OgCard, ogResponse, loadMarkDataUri } from "../../_shared";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * FALLBACK card: pages prefer a hero_image, so keep it branded/generic-title
 * (headline + kind). Fallback chain: posts table → news_items table → 404.
 *
 * `?locale=` (en|vi|th|es) picks the language — without it a VI page shared an
 * EN card (Nick 21/8). Missing/unknown locale falls back to the site default (vi).
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

/** VI eyebrow overrides — the VN market reads these on every share card. */
const TYPE_STATUS_VI: Record<string, string> = {
  preview: "TRƯỚC TRẬN",
  result: "KẾT QUẢ",
  standings: "BẢNG XẾP HẠNG",
  recap: "NHÌN LẠI",
  analysis: "NHẬN ĐỊNH",
  news: "TIN TỨC",
  transfer: "CHUYỂN NHƯỢNG",
  "no-play": "BỎ QUA",
  "post-mortem": "MỔ XẺ",
  guide: "HƯỚNG DẪN",
};

function typeLabel(type: string, lang: Lang): string {
  if (lang === "vi" && TYPE_STATUS_VI[type]) return TYPE_STATUS_VI[type];
  return TYPE_STATUS[type] ?? type.toUpperCase();
}

async function card(
  headline: string,
  type: string,
  lang: Lang,
  headers: Record<string, string>,
): Promise<Response> {
  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow={typeLabel(type, lang)}
      title={headline}
      footer="banhbong.net"
      footerRight="banhbong.net News"
    />,
    { headers },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };
  const lang = resolveLang(new URL(request.url).searchParams.get("locale") ?? undefined);

  // getPost falls back to the EN row when the language is missing.
  const post = await getPost(slug, lang);
  if (post) {
    return card(post.meta_title ?? post.title, post.type, lang, headers);
  }

  // Fallback: news_items table (auto-gen preview/result/standings)
  const newsItem = await getNewsItemBySlug(slug);
  if (!newsItem) return new Response("Not found", { status: 404 });

  return card(getHeadline(newsItem, lang), newsItem.type, lang, headers);
}
