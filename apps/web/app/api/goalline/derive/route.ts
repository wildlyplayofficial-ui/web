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

    const result = await deriveLineForMatches(body.matches);
    if (!result) {
      const names = body.matches.map((m) => `${m.homeTeam} vs ${m.awayTeam}`).join(" | ");
      return NextResponse.json({ error: `Could not derive: ${names}` }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Derive failed" }, { status: 500 });
  }
}
