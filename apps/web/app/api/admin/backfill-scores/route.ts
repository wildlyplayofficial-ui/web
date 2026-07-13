import { getServiceSupabase } from "@/lib/supabase-server";
import { lsFetch } from "@/lib/ls-fetch";

/**
 * POST /api/admin/backfill-scores
 * Fetches historical match results from livescore-api scores/history endpoint
 * and upserts into match_live_state with status='finished'.
 * Protected by REVALIDATE_SECRET.
 */

const LS = "https://livescore-api.com/api-client";
const CID = 362; // FIFA World Cup 2026

function parseScore(s: string): { home: number; away: number } | null {
  if (!s || s === "? - ?") return null;
  const p = s.split("-").map((x) => parseInt(x.trim(), 10));
  return p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) ? { home: p[0], away: p[1] } : null;
}

export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceSupabase();
  if (!sb) return Response.json({ error: "DB not configured" }, { status: 500 });

  const key = process.env.LIVESCORE_API_KEY;
  const secretKey = process.env.LIVESCORE_API_SECRET;
  if (!key || !secretKey) {
    return Response.json({ error: "Livescore API not configured" }, { status: 500 });
  }

  // Fetch all historical results using scores/history endpoint (works for past dates)
  const from = "2026-06-11";
  const to = new Date().toISOString().slice(0, 10);
  const rows: Array<Record<string, unknown>> = [];
  let page = 1;

  while (true) {
    const q = `key=${key}&secret=${secretKey}&competition_id=${CID}&from=${from}&to=${to}&page=${page}`;
    const res = await lsFetch(`${LS}/scores/history.json?${q}`);
    const data = await res.json();
    if (!data.success || !data.data?.match?.length) break;

    for (const m of data.data.match) {
      const sc = parseScore(m.ft_score);
      if (!sc) continue;
      const kickoff = m.scheduled
        ? `${m.date}T${m.scheduled}:00Z`
        : `${m.date}T00:00:00Z`;
      rows.push({
        id: String(m.fixture_id || m.id),
        home_team: m.home_name,
        away_team: m.away_name,
        home_score: sc.home,
        away_score: sc.away,
        minute: null,
        status: "finished",
        period: null,
        kickoff_utc: kickoff,
        competition: m.competition_name || "FIFA World Cup",
        events_url: m.events || null,
        updated_at: new Date().toISOString(),
      });
    }

    if (!data.data.next_page) break;
    page++;
  }

  if (rows.length === 0) {
    return Response.json({ message: "No historical results found", upserted: 0 });
  }

  const { error } = await sb.from("match_live_state").upsert(rows, { onConflict: "id" });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    message: `Backfilled ${rows.length} match scores`,
    upserted: rows.length,
    dateRange: `${from} to ${to}`,
    pages: page,
  });
}
