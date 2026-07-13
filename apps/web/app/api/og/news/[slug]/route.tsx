import { getPost, getPickById, getTrackRecordForAuthor } from "@/lib/data";
import { getNewsItemBySlug } from "@/lib/news";
import { teamBadge, teamsFromSlug } from "@/lib/team-badges";
import { accentFor, pickFields, renderShareCard } from "../../_share-card";
import type { Author } from "@/lib/types";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * Vibrant team-colored card (see _share-card). When the article links a pick,
 * the card shows the two teams, the pick/result and CLV; otherwise it falls
 * back to a branded hero with the headline.
 *
 * Fallback chain: posts table → news_items table → 404.
 * News items (preview/result/standings) get crest cards via teamsFromSlug.
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const post = await getPost(slug, "en");

  // Fallback: news_items table (auto-gen preview/result/standings)
  if (!post) {
    const newsItem = await getNewsItemBySlug(slug);
    if (!newsItem) return new Response("Not found", { status: 404 });

    const author: Author = "curator"; // news items byline = WildlyPlay News, no personal author
    const accent = accentFor(author);
    const record = await getTrackRecordForAuthor(author);
    const status = { label: TYPE_STATUS[newsItem.type] ?? newsItem.type.toUpperCase(), color: accent };
    const teams = teamsFromSlug(slug);

    // Pick-linked news item: fetch pick for team data + status
    if (newsItem.pick_id) {
      const pick = await getPickById(newsItem.pick_id);
      if (pick) {
        const pf = pickFields(pick, accent);
        return renderShareCard({
          headline: newsItem.headline_en,
          record,
          author,
          home: pick.home_team,
          away: pick.away_team,
          homeBadge: teamBadge(pick.home_team),
          awayBadge: teamBadge(pick.away_team),
          league: pick.league,
          status: pf.status,
          infoLine: pf.infoLine,
          metric: pf.metric,
        });
      }
    }

    // Crest card from slug (preview-inter-miami-vs-la-galaxy-2026-07-17)
    if (teams) {
      return renderShareCard({
        headline: newsItem.headline_en,
        record,
        author,
        home: teams.home,
        away: teams.away,
        homeBadge: teamBadge(teams.home),
        awayBadge: teamBadge(teams.away),
        league: null,
        status,
        subhead: newsItem.headline_en,
        infoLine: null,
        metric: null,
      });
    }

    // Standings or non-matchup: branded card
    return renderShareCard({
      headline: newsItem.headline_en,
      record,
      author,
      home: null,
      away: null,
      homeBadge: null,
      awayBadge: null,
      league: null,
      status,
      infoLine: null,
      metric: null,
    });
  }

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

  // No linked pick: recover the two teams from the slug so the card is still
  // colored by both sides (e.g. "…-france-vs-morocco-…"). Falls back to a
  // branded hero when the slug isn't a matchup.
  const teams = teamsFromSlug(slug);
  const status = { label: TYPE_STATUS[post.type] ?? post.type.toUpperCase(), color: accent };
  if (teams) {
    return renderShareCard({
      ...base,
      home: teams.home,
      away: teams.away,
      homeBadge: teamBadge(teams.home),
      awayBadge: teamBadge(teams.away),
      league: null,
      status,
      subhead: base.headline,
      infoLine: null,
      metric: null,
    });
  }

  return renderShareCard({
    ...base,
    home: null,
    away: null,
    homeBadge: null,
    awayBadge: null,
    league: null,
    status,
    infoLine: null,
    metric: null,
  });
}
