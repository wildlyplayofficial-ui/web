import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";

/** GET /api/goalline/recent-picks?cardId=xxx — last 5 picks for live toast. */
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) return NextResponse.json({ picks: [] });

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ picks: [] });

  const { data } = await sb
    .from("gl_picks")
    .select("id, side, server_received_at, gl_users!inner(display_name)")
    .eq("daily_card_id", cardId)
    .order("server_received_at", { ascending: false })
    .limit(5);

  interface RawRow {
    id: string;
    side: string;
    server_received_at: string;
    gl_users: { display_name: string } | { display_name: string }[];
  }

  const picks = ((data ?? []) as unknown as RawRow[]).map((p) => {
    const user = Array.isArray(p.gl_users) ? p.gl_users[0] : p.gl_users;
    return {
      id: p.id,
      side: p.side,
      name: user?.display_name ?? "Anonymous",
      at: p.server_received_at,
    };
  });

  return NextResponse.json({ picks });
}
