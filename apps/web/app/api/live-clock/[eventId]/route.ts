/**
 * Proxies live clock data from odds-api for a given event.
 * Returns the clock object (minute, period, running, statusDetail)
 * with 30-second cache headers for live data freshness.
 */

const ODDS_API_BASE = "https://api.odds-api.io/v3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const { eventId } = await params;

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ODDS_API_KEY not configured" }, { status: 503 });
  }

  // Validate eventId is a numeric bigint (odds-api event IDs are integers).
  if (!/^\d{1,20}$/.test(eventId)) {
    return Response.json({ error: "invalid eventId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${ODDS_API_BASE}/events/${eventId}?apiKey=${apiKey}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      // Event not found or API error — return empty clock.
      return Response.json(
        { clock: null, status: null },
        {
          status: 200,
          headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
        },
      );
    }

    const event = (await res.json()) as {
      clock?: {
        minute?: number;
        playedSeconds?: number;
        period?: number;
        running?: boolean;
        statusDetail?: string;
      };
      status?: string;
      scores?: { home?: number; away?: number };
    };

    return Response.json(
      { clock: event.clock ?? null, status: event.status ?? null, scores: event.scores ?? null },
      {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
      },
    );
  } catch {
    return Response.json(
      { clock: null, status: null },
      { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
    );
  }
}
