import { fetchLiveMatches, getTodaysMatches } from "@/lib/matches";

/**
 * Returns today's WC matches for client-side components.
 * Includes all matches (upcoming/live/finished) with status + minute.
 * 30-second cache headers match the poll interval.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const liveOnly = url.searchParams.get("live") === "1";

  const matches = liveOnly ? await fetchLiveMatches() : await getTodaysMatches();

  const payload = {
    matches: matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      minute: m.minute,
      status: m.status,
      kickoffUtc: m.kickoffUtc,
    })),
  };

  return Response.json(payload, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}
