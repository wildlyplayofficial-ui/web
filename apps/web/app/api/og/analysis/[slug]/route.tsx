import { getAnalysisArticleBySlug } from "@/lib/analysis-articles";
import { teamsFromSlug, teamsFromSlugLoose } from "@/lib/team-badges";
import { renderDeskCard } from "../../_desk-card";

/**
 * Dynamic share image (PNG 1200x630) for Desk-authored analysis articles
 * (analysis_articles table). Published articles only — drafts 404.
 * Layout lives in _desk-card (firewall-safe Desk variant of the news card).
 */

const KIND_BADGE: Record<string, string> = {
  preview: "PREVIEW",
  recap: "RECAP",
  roundup: "ROUNDUP",
};

/** Parse "Home vs Away: …" style titles when the slug carries no matchup. */
function teamsFromTitle(title: string): { home: string; away: string } | null {
  const m = title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[:\u2013\u2014-]|$)/i);
  if (!m) return null;
  return { home: m[1].trim(), away: m[2].trim() };
}

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
  const league = article.league || null;
  const badgeLabel = KIND_BADGE[article.kind] ?? article.kind.toUpperCase();

  // Roundups (and matchups we can't resolve) fall back to the brand-band card.
  const teams = article.kind === "roundup"
    ? null
    : teamsFromSlug(slug) ?? teamsFromTitle(article.title) ?? teamsFromSlugLoose(slug);

  return renderDeskCard({
    home: teams?.home ?? null,
    away: teams?.away ?? null,
    badgeLabel,
    headline: article.title,
    league,
    dateLine,
  });
}
