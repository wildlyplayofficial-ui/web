import { NextResponse } from "next/server";
import { deriveLineForMatches } from "@/lib/goalline/line-engine";

/** POST /api/goalline/derive — derive line + odds for selected matches. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      matches?: { id: string; homeTeam: string; awayTeam: string; kickoffUtc: string }[];
    };

    if (!body.matches || body.matches.length !== 3) {
      return NextResponse.json({ error: "3 matches required" }, { status: 400 });
    }

    // Debug per-match search + odds
    const apiKey = process.env.ODDS_API_KEY;
    const debugLog: string[] = [];
    if (apiKey) {
      for (const m of body.matches) {
        const searchRes = await fetch(
          `https://api.odds-api.io/v3/events/search?query=${encodeURIComponent(m.homeTeam)}&sport=football&apiKey=${apiKey}`,
          { cache: "no-store" },
        );
        const events = await searchRes.json();
        const wcEvent = Array.isArray(events)
          ? events.find((e: { league?: { slug?: string } }) => e.league?.slug === "international-fifa-world-cup")
          : null;
        if (wcEvent) {
          const oddsRes = await fetch(
            `https://api.odds-api.io/v3/odds?eventId=${wcEvent.id}&bookmakers=Sbobet&apiKey=${apiKey}`,
            { cache: "no-store" },
          );
          const oddsData = await oddsRes.json();
          const bm = oddsData?.bookmakers?.Sbobet;
          const totals = Array.isArray(bm) ? bm.find((x: { name: string }) => x.name === "Totals") : null;
          debugLog.push(`${m.homeTeam}: event=${wcEvent.id} odds=${totals ? "YES" : "NO"}`);
        } else {
          debugLog.push(`${m.homeTeam}: NO WC event found (${Array.isArray(events) ? events.length : 0} results)`);
        }
      }
    }

    const result = await deriveLineForMatches(body.matches);
    if (!result) {
      return NextResponse.json({ error: `Could not derive: ${debugLog.join(" | ")}` }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Derive failed" }, { status: 500 });
  }
}
