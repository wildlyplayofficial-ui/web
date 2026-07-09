import { getMatchBySlug, getTrackRecordForAuthor } from "@/lib/data";
import { teamBadge } from "@/lib/team-badges";
import { accentFor, pickFields, renderShareCard } from "../../_share-card";
import type { Author } from "@/lib/types";

/**
 * Dynamic share image (PNG 1200x630) for /match hub pages.
 * Vibrant team-colored card (see _share-card) reflecting the current state of
 * our coverage — pick / result / watching / preview.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);
  if (!match) return new Response("Not found", { status: 404 });

  const pick = match.picks[0] ?? null;
  const author: Author = pick?.author ?? match.watching?.author ?? "curator";
  const accent = accentFor(author);
  const record = await getTrackRecordForAuthor(author);

  let status: { label: string; color: string };
  let infoLine: string | null;
  let metric = null as ReturnType<typeof pickFields>["metric"];
  if (pick) {
    ({ status, infoLine, metric } = pickFields(pick, accent));
  } else if (match.watching) {
    status = { label: "WATCHING", color: accent };
    infoLine = match.league || "On our radar";
  } else {
    status = { label: "PREVIEW", color: accent };
    infoLine = match.league || "Match preview";
  }

  return renderShareCard({
    home: match.homeTeam,
    away: match.awayTeam,
    homeBadge: teamBadge(match.homeTeam),
    awayBadge: teamBadge(match.awayTeam),
    league: match.league || null,
    status,
    headline: `${match.homeTeam} vs ${match.awayTeam}`,
    infoLine,
    metric,
    record,
    author,
  });
}
