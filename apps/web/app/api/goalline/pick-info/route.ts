import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

/** GET /api/goalline/pick-info?id=xxx — fetch WP pick's odds + stake for settle page. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({});

  const { data } = await sb
    .from("picks")
    .select("odds_publish, stake_units, home_team, away_team, selection, market, line")
    .eq("id", id)
    .single();

  if (!data) return NextResponse.json({});
  return NextResponse.json(data);
}
