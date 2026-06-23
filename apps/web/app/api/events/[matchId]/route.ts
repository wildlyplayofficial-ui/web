/**
 * Proxies match events (goals, cards, subs) from livescore-api.com.
 * 30-second cache headers match the client poll interval.
 */

const LIVESCORE_BASE = "https://livescore-api.com/api-client";

type EventType = "GOAL" | "SUBSTITUTION" | "YELLOW_CARD" | "RED_CARD" | "YELLOW_RED_CARD";

interface LivescoreEvent {
  event: string;
  player: string;
  time: string;
  home_away: "h" | "a";
  info: string;
}

export interface MatchEvent {
  time: string;
  type: EventType;
  emoji: string;
  player: string;
  info: string;
  side: "home" | "away";
}

const EMOJI_MAP: Record<EventType, string> = {
  GOAL: "\u26BD",
  YELLOW_CARD: "\uD83D\uDFE8",
  RED_CARD: "\uD83D\uDFE5",
  YELLOW_RED_CARD: "\uD83D\uDFE5",
  SUBSTITUTION: "\uD83D\uDD04",
};

const KNOWN_TYPES = new Set<string>(Object.keys(EMOJI_MAP));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
): Promise<Response> {
  const { matchId } = await params;

  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) {
    return Response.json({ error: "Livescore credentials not configured" }, { status: 503 });
  }

  // Validate matchId is numeric.
  if (!/^\d{1,12}$/.test(matchId)) {
    return Response.json({ error: "invalid matchId" }, { status: 400 });
  }

  try {
    const url = `${LIVESCORE_BASE}/scores/events.json?key=${key}&secret=${secret}&id=${matchId}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return Response.json([], {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
      });
    }

    const body = (await res.json()) as {
      success: boolean;
      data?: { event?: LivescoreEvent[] };
    };

    if (!body.success || !body.data?.event) {
      return Response.json([], {
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
      });
    }

    const events: MatchEvent[] = body.data.event
      .filter((e) => KNOWN_TYPES.has(e.event))
      .map((e) => ({
        time: e.time,
        type: e.event as EventType,
        emoji: EMOJI_MAP[e.event as EventType],
        player: e.player,
        info: e.info,
        side: e.home_away === "h" ? "home" as const : "away" as const,
      }));

    return Response.json(events, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    });
  } catch {
    return Response.json([], {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  }
}
