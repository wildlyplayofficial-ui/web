import { NextResponse } from "next/server";

const BASE = "https://api.odds-api.io/v3";

/** Debug: test odds-api.io endpoints for WC. DELETE after mapping done. */
export async function GET(request: Request) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ODDS_API_KEY not configured" }, { status: 503 });

  const url = new URL(request.url);
  const step = url.searchParams.get("step") ?? "search";
  const query = url.searchParams.get("q") ?? "Brazil";

  try {
    if (step === "search") {
      // Search WC events by team name
      const res = await fetch(`${BASE}/events/search?query=${encodeURIComponent(query)}&sport=football&apiKey=${apiKey}`, { cache: "no-store" });
      const data = await res.json();
      const events = Array.isArray(data) ? data.slice(0, 10) : data;
      return NextResponse.json({ events, status: res.status });
    }

    if (step === "odds") {
      const eventId = url.searchParams.get("eventId");
      if (!eventId) return NextResponse.json({ error: "eventId required" });
      const res = await fetch(`${BASE}/odds?eventId=${eventId}&bookmakers=Sbobet&apiKey=${apiKey}`, { cache: "no-store" });
      const raw = await res.text();
      try {
        return NextResponse.json({ status: res.status, data: JSON.parse(raw) });
      } catch {
        return NextResponse.json({ status: res.status, raw: raw.slice(0, 500) });
      }
    }

    return NextResponse.json({ error: "step=search|odds" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
