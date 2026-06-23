import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";

/** GET /api/goalline/card-stats?cardId=xxx — total picks + over/under split for social proof. */
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) return NextResponse.json({ totalPicks: 0, overCount: 0, underCount: 0 });

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ totalPicks: 0, overCount: 0, underCount: 0 });

  const [total, over, under] = await Promise.all([
    sb.from("gl_picks").select("id", { count: "exact", head: true }).eq("daily_card_id", cardId),
    sb.from("gl_picks").select("id", { count: "exact", head: true }).eq("daily_card_id", cardId).eq("side", "over"),
    sb.from("gl_picks").select("id", { count: "exact", head: true }).eq("daily_card_id", cardId).eq("side", "under"),
  ]);

  return NextResponse.json({
    totalPicks: total.count ?? 0,
    overCount: over.count ?? 0,
    underCount: under.count ?? 0,
  });
}
