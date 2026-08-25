/**
 * Proxies live clock data from odds-api for a given event.
 * Returns the clock object (minute, period, running, statusDetail)
 * Đệm 120 giây (Nick chốt 25/8): 30 giây thì MỘT trận đang đá đã ngốn 120
 * lượt/giờ, vượt trần 100 lượt/giờ của nhà cung cấp trước cả khi có trận thứ hai.
 */

import { goiOdds } from "@/lib/odds-key";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const { eventId } = await params;


  // Validate eventId is a numeric bigint (odds-api event IDs are integers).
  if (!/^\d{1,20}$/.test(eventId)) {
    return Response.json({ error: "invalid eventId" }, { status: 400 });
  }

  try {
    const res = await goiOdds(`events/${eventId}`, { cache: "no-store" });
    if (!res) {
      return Response.json({ error: "ODDS_API_KEY not configured" }, { status: 503 });
    }

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
        headers: { "Cache-Control": "public, max-age=120, s-maxage=120" },
      },
    );
  } catch {
    return Response.json(
      { clock: null, status: null },
      { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
    );
  }
}
