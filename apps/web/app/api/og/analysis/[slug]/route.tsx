import { getAnalysisArticleBySlug } from "@/lib/analysis-articles";
import { OgCard, ogResponse, loadMarkDataUri, loadBadgeDataUri } from "../../_shared";
import { teamBadge } from "@/lib/team-badges";
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

// Bản /vi: nhãn tiếng Việt (Peter 25/8 — nhãn EN trên bài VI là lỗi)
const KIND_BADGE_VI: Record<string, string> = {
  preview: "NHẬN ĐỊNH",
  recap: "TỔNG KẾT",
  roundup: "ĐIỂM TIN",
  analysis: "PHÂN TÍCH",
  news: "TIN TỨC",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  // `locale` (en|vi|th|es) picks the badge language; `v` is a cache-bust token,
  // read but unused in rendering.
  const vi = searchParams.get("locale") === "vi";
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
  const badgeLabel = (vi ? KIND_BADGE_VI[article.kind] : KIND_BADGE[article.kind]) ?? article.kind.toUpperCase();

  // Logo 2 đội trên thẻ soi kèo (Peter 25/8: "bài soi kèo phải có logo").
  // teams[] ghi tên hiển thị ("Real Madrid") — tra thẳng bảng badge theo tên.
  const teamNames = (article.teams ?? []).slice(0, 2);
  const crests = (
    await Promise.all(
      teamNames.map((t) => {
        const url = teamBadge(t);
        return url ? loadBadgeDataUri(url) : Promise.resolve(null);
      }),
    )
  ).filter((x): x is string => Boolean(x));

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      crests={crests.length ? crests : null}
      eyebrow={badgeLabel}
      title={article.title}
      topRight={article.league || null}
      footer={SITE_NAME}
      footerRight={`${DESK} (AI) · ${dateLine}`}
    />,
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
