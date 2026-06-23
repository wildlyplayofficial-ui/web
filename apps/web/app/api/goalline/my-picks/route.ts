import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";

/**
 * GET /api/goalline/my-picks?deviceId=xxx
 *
 * Returns all picks for a device's user, joined with card info.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  // Look up user by device_id
  const { data: user } = await sb
    .from("gl_users")
    .select("id, display_name, discriminator")
    .eq("device_id", deviceId)
    .limit(1)
    .single();

  if (!user) {
    return NextResponse.json({ picks: [], displayName: null, discriminator: null });
  }

  // Fetch picks joined with card info
  const { data: picks, error } = await sb
    .from("gl_picks")
    .select(`
      id,
      side,
      odds_locked,
      stake_points,
      status,
      points_added,
      server_received_at,
      daily_card_id,
      gl_daily_cards (
        card_number,
        utc_date,
        goal_line
      )
    `)
    .eq("user_id", user.id)
    .order("server_received_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  interface RawCardRow {
    card_number: number;
    utc_date: string;
    goal_line: number;
  }

  interface RawPick {
    id: string;
    side: string;
    odds_locked: number;
    stake_points: number;
    status: string;
    points_added: number | null;
    server_received_at: string;
    daily_card_id: string;
    // Supabase returns one-to-one FK joins as an array
    gl_daily_cards: RawCardRow[] | RawCardRow | null;
  }

  const result = (picks as unknown as RawPick[]).map((p) => ({
    id: p.id,
    cardId: p.daily_card_id,
    side: p.side,
    oddsLocked: p.odds_locked,
    stakePoints: p.stake_points,
    status: p.status,
    pointsAwarded: p.points_added,
    createdAt: p.server_received_at,
    card: (() => {
      const raw = Array.isArray(p.gl_daily_cards)
        ? p.gl_daily_cards[0]
        : p.gl_daily_cards;
      if (!raw) return null;
      return {
        cardNumber: raw.card_number,
        utcDate: raw.utc_date,
        goalLine: raw.goal_line,
      };
    })(),
  }));

  return NextResponse.json({ picks: result, displayName: user.display_name ?? null, discriminator: user.discriminator ?? null, userId: user.id });
}
