// TEMP debug route — inspect LiveScore feed shapes from Vercel (IP-allowlisted).
// REMOVE before merging to main.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://livescore-api.com/api-client";

export async function GET() {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "no creds" });

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);
  const from = new Date(now - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 86_400_000).toISOString().slice(0, 10);

  const urls: Record<string, string> = {
    plain: `${BASE}/fixtures/matches.json?competition_id=362&key=${key}&secret=${secret}&size=100`,
    today: `${BASE}/fixtures/matches.json?competition_id=362&key=${key}&secret=${secret}&date=${today}`,
    yesterday: `${BASE}/fixtures/matches.json?competition_id=362&key=${key}&secret=${secret}&date=${yesterday}`,
    history: `${BASE}/matches/history.json?competition_id=362&key=${key}&secret=${secret}&from=${from}&to=${to}`,
  };

  const out: Record<string, unknown> = {};
  for (const [name, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      const arr = j?.data?.fixtures ?? j?.data?.match ?? [];
      out[name] = {
        success: j?.success,
        count: arr.length,
        sample: arr[0] ?? null,
        portugal: arr.filter(
          (m: Record<string, unknown>) =>
            JSON.stringify(m).includes("Portugal"),
        ),
      };
    } catch (e) {
      out[name] = { error: String(e) };
    }
  }
  return NextResponse.json(out);
}
