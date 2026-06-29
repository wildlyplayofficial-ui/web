import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";

/**
 * POST /api/goalline/sync-game-score — Retroactively set Telegram native game score.
 *
 * Called when a user opens a game from an inline card and already has a pick.
 * Body: { userId: string, inlineMessageId: string }
 */
export async function POST(request: NextRequest) {
  let body: { userId?: string; inlineMessageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { userId, inlineMessageId } = body;
  if (!userId || !inlineMessageId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = process.env.TMA_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 503 });

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  // Look up Telegram numeric ID
  const { data: user } = await sb
    .from("gl_users")
    .select("auth_ref")
    .eq("id", userId)
    .eq("auth_provider", "telegram")
    .single();

  if (!user?.auth_ref) return NextResponse.json({ ok: false });

  const tgUserId = Number(user.auth_ref);
  if (!tgUserId) return NextResponse.json({ ok: false });

  // Count total picks as score
  const { count } = await sb
    .from("gl_picks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const score = Math.max(count ?? 1, 1);

  const res = await fetch(`https://api.telegram.org/bot${token}/setGameScore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: tgUserId,
      score,
      inline_message_id: inlineMessageId,
      force: true,
    }),
  });

  const json = await res.json().catch(() => null);
  console.log("[sync-game-score]", JSON.stringify({ tgUserId, score, inlineMessageId, response: json }));

  return NextResponse.json({ ok: json?.ok ?? false, score });
}
