import { NextResponse } from "next/server";

export interface MatchOption {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  competition: string;
}

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
const WC_COMPETITION_ID = 362;
const CACHE_SECONDS = 300;

interface LivescoreFixture {
  id: string;
  fixture_id: string;
  home_name: string;
  away_name: string;
  date: string;
  time: string;
  competition_name: string;
}

/**
 * GET /api/goalline/matches — today's + tomorrow's WC matches from livescore-api.
 * Used by the admin match picker for card creation.
 */
export async function GET(request: Request) {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) {
    return NextResponse.json(
      { error: "Livescore credentials not configured" },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const now = new Date();
    const today = dateParam || now.toISOString().slice(0, 10);
    const tomorrow = dateParam
      ? new Date(new Date(dateParam).getTime() + 86400000).toISOString().slice(0, 10)
      : new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    const [todayRes, tomorrowRes] = await Promise.all([
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?key=${key}&secret=${secret}&competition_id=${WC_COMPETITION_ID}&date=${today}`,
        { cache: "no-store" },
      ),
      fetch(
        `${LIVESCORE_BASE}/fixtures/matches.json?key=${key}&secret=${secret}&competition_id=${WC_COMPETITION_ID}&date=${tomorrow}`,
        { cache: "no-store" },
      ),
    ]);

    const todayData = await todayRes.json();
    const tomorrowData = await tomorrowRes.json();

    const allFixtures: LivescoreFixture[] = [
      ...((todayData.success && todayData.data?.fixtures) ? todayData.data.fixtures : []),
      ...((tomorrowData.success && tomorrowData.data?.fixtures) ? tomorrowData.data.fixtures : []),
    ];

    const seen = new Set<string>();
    const matches: MatchOption[] = [];

    for (const f of allFixtures) {
      const id = f.fixture_id || f.id;
      if (seen.has(id)) continue;
      seen.add(id);

      const kickoffUtc = f.date && f.time ? `${f.date}T${f.time}Z` : "";

      matches.push({
        id,
        homeTeam: f.home_name,
        awayTeam: f.away_name,
        kickoffUtc,
        competition: f.competition_name || "FIFA World Cup 2026",
      });
    }

    matches.sort(
      (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
    );

    return NextResponse.json(
      { matches },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 },
    );
  }
}
