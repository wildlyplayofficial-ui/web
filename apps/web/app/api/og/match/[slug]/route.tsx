import { getMatchBySlug } from "@/lib/data";
import { formatKickoff } from "@/lib/format";
import { OgCard, ogResponse } from "../../_shared";

/**
 * Dynamic share image (PNG 1200x630) for /match hub pages.
 * Branded green card reflecting the current coverage state (pick / result /
 * watching / preview) with the two teams, league and kickoff.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);
  if (!match) return new Response("Not found", { status: 404 });

  const pick = match.picks[0] ?? null;
  let label = "Preview";
  if (pick) {
    label =
      pick.status === "won" || pick.status === "lost" || pick.status === "push"
        ? pick.status.toUpperCase()
        : "Our pick";
  } else if (match.watching) {
    label = "Watching";
  }

  return ogResponse(
    <OgCard
      eyebrow={label}
      title={`${match.homeTeam} vs ${match.awayTeam}`}
      topRight={match.league || null}
      detail={[{ label: "Kick-off", value: formatKickoff(match.kickoffUtc, "en") }]}
    />,
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
