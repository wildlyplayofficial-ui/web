import { getPost, getPickById, getTrackRecordForAuthor } from "@/lib/data";
import { teamBadge } from "@/lib/team-badges";
import { accentFor, pickFields, renderShareCard } from "../../_share-card";
import type { Author } from "@/lib/types";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * Vibrant team-colored card (see _share-card). When the article links a pick,
 * the card shows the two teams, the pick/result and CLV; otherwise it falls
 * back to a branded hero with the headline.
 */

const TYPE_STATUS: Record<string, string> = {
  preview: "PREVIEW",
  recap: "RECAP",
  analysis: "ANALYSIS",
  news: "NEWS",
  "no-play": "NO PLAY",
  "post-mortem": "POST-MORTEM",
  guide: "GUIDE",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const post = await getPost(slug, "en");
  if (!post) return new Response("Not found", { status: 404 });

  const author: Author = post.author ?? "curator";
  const accent = accentFor(author);
  const pick = post.pick_ids?.[0] ? await getPickById(post.pick_ids[0]) : null;
  const record = await getTrackRecordForAuthor(author);

  const base = {
    headline: post.meta_title ?? post.title,
    record,
    author,
  };

  if (pick) {
    const { status, infoLine, metric } = pickFields(pick, accent);
    return renderShareCard({
      ...base,
      home: pick.home_team,
      away: pick.away_team,
      homeBadge: teamBadge(pick.home_team),
      awayBadge: teamBadge(pick.away_team),
      league: pick.league,
      status,
      infoLine,
      metric,
    });
  }

  return renderShareCard({
    ...base,
    home: null,
    away: null,
    homeBadge: null,
    awayBadge: null,
    league: null,
    status: { label: TYPE_STATUS[post.type] ?? post.type.toUpperCase(), color: accent },
    infoLine: null,
    metric: null,
  });
}
