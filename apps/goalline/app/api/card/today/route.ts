import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/card/today — Today's card with matches + optional user pick.
 *
 * Query params:
 *   userId (optional) — device-id to fetch the user's pick
 *
 * Returns: { card, matches, pick, communitySplit } or { card: null }
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ card: null }, { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const today = new Date().toISOString().slice(0, 10);

  // Fetch today's card
  const { data: card } = await supabase
    .from("gl_daily_cards")
    .select("id, card_number, utc_date, goal_line, over_odds, under_odds, cutoff_time_utc, status, method_note, settlement_result, void_reason")
    .eq("utc_date", today)
    .in("status", ["open", "locked", "live", "settled", "voided"])
    .order("card_number", { ascending: false })
    .limit(1)
    .single();

  if (!card) {
    return NextResponse.json({ card: null });
  }

  // Fetch linked matches
  const { data: junctions } = await supabase
    .from("gl_daily_card_matches")
    .select("match_id, sort_order")
    .eq("daily_card_id", card.id)
    .order("sort_order");

  let matches: Record<string, unknown>[] = [];
  if (junctions && junctions.length > 0) {
    const matchIds = junctions.map((j: { match_id: string }) => j.match_id);
    const { data: matchRows } = await supabase
      .from("gl_matches")
      .select("id, external_match_id, home_team, away_team, kickoff_time_utc, status, home_score, away_score, valid_goals")
      .in("id", matchIds);

    if (matchRows) {
      matches = matchRows.map((m: Record<string, unknown>) => {
        const junction = junctions.find(
          (j: { match_id: string }) => j.match_id === m.id,
        );
        return { ...m, sort_order: junction?.sort_order ?? 0 };
      });
    }
  }

  // Fetch user's pick if userId provided
  let pick = null;
  if (userId) {
    const { data: pickRow } = await supabase
      .from("gl_picks")
      .select("id, side, odds_locked, stake_points, status, net_profit, participation_bonus, points_added")
      .eq("daily_card_id", card.id)
      .eq("user_id", userId)
      .single();

    if (pickRow) pick = pickRow;
  }

  // Community split — only if user has a pick (spec §10)
  let communitySplit = null;
  if (pick) {
    const { count: overCount } = await supabase
      .from("gl_picks")
      .select("id", { count: "exact", head: true })
      .eq("daily_card_id", card.id)
      .eq("side", "over");

    const { count: underCount } = await supabase
      .from("gl_picks")
      .select("id", { count: "exact", head: true })
      .eq("daily_card_id", card.id)
      .eq("side", "under");

    const total = (overCount ?? 0) + (underCount ?? 0);
    if (total > 0) {
      communitySplit = {
        over: Math.round(((overCount ?? 0) / total) * 100),
        under: Math.round(((underCount ?? 0) / total) * 100),
      };
    }
  }

  return NextResponse.json({ card, matches, pick, communitySplit });
}
