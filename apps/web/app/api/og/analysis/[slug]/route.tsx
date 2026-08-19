import { getAnalysisArticleBySlug } from "@/lib/analysis-articles";
import { OgCard, ogResponse } from "../../_shared";
import { SITE_NAME, DESK } from "@/lib/brand";

/**
 * Dynamic share image (PNG 1200x630) for Desk-authored analysis articles.
 * Published articles only — drafts 404. This is a FALLBACK card: pages prefer a
 * hero_image, so keep it branded/generic-title (headline + kind + league).
 */

const KIND_BADGE: Record<string, string> = {
  preview: "PREVIEW",
  recap: "RECAP",
  roundup: "ROUNDUP",
  analysis: "ANALYSIS",
  news: "NEWS",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  // `locale` (en|vi|th|es) and `v` (cache-bust token) keep URLs stable across
  // langs/updates; the card copy is EN-only until i18n columns exist, so both
  // are read but intentionally unused in rendering.
  searchParams.get("locale");
  searchParams.get("v");

  // Data layer only returns published rows — drafts 404 here.
  const article = await getAnalysisArticleBySlug(slug);
  if (!article) return new Response("Not found", { status: 404 });

  const dateLine = new Date(article.published_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const badgeLabel = KIND_BADGE[article.kind] ?? article.kind.toUpperCase();

  return ogResponse(
    <OgCard
      eyebrow={badgeLabel}
      title={article.title}
      topRight={article.league || null}
      footer={SITE_NAME}
      footerRight={`${DESK} (AI) · ${dateLine}`}
    />,
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
