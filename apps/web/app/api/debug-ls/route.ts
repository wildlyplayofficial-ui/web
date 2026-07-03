// TEMP debug route — inspect LiveScore feed shapes from Vercel (IP-allowlisted).
// REMOVE before merging to main.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://livescore-api.com/api-client";

export async function GET(req: Request) {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "no creds" });

  const sp = new URL(req.url).searchParams;
  const feed = sp.get("feed") ?? "history";
  const page = sp.get("page") ?? "1";
  const date = sp.get("date") ?? "";

  const now = Date.now();
  const from = new Date(now - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 86_400_000).toISOString().slice(0, 10);

  let url: string;
  if (feed === "history") {
    url = `${BASE}/matches/history.json?competition_id=362&key=${key}&secret=${secret}&from=${from}&to=${to}&page=${page}`;
  } else if (feed === "live") {
    url = `${BASE}/scores/live.json?competition_id=362&key=${key}&secret=${secret}`;
  } else {
    url = `${BASE}/fixtures/matches.json?competition_id=362&key=${key}&secret=${secret}${date ? `&date=${date}` : "&size=100"}`;
  }

  const res = await fetch(url, { cache: "no-store" });
  const j = await res.json();
  return NextResponse.json(j);
}
