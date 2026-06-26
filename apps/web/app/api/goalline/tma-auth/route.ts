import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "crypto";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import { verifyTmaInitData } from "@/lib/goalline/tma-verify";

/**
 * POST /api/goalline/tma-auth — Authenticate a Telegram Mini App user.
 *
 * Body: { initData: string }
 *
 * Verifies TMA initData, finds or creates a gl_users row (auth_provider='telegram'),
 * optionally joins a group if start_param starts with 'grp_',
 * and returns a signed token.
 */
export async function POST(request: NextRequest) {
  let body: { initData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { initData } = body;
  if (!initData) {
    return NextResponse.json({ error: "initData is required" }, { status: 400 });
  }

  const botToken = process.env.TMA_BOT_TOKEN ?? process.env.CURATOR_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 503 });
  }

  const verified = verifyTmaInitData(initData, botToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired initData" }, { status: 401 });
  }

  // Parse user from the verified data — "user" field is JSON-encoded
  const userJson = verified.user;
  if (!userJson) {
    return NextResponse.json({ error: "No user in initData" }, { status: 400 });
  }

  let tgUser: { id: number; first_name: string; last_name?: string; username?: string };
  try {
    tgUser = JSON.parse(userJson);
  } catch {
    return NextResponse.json({ error: "Invalid user JSON in initData" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  // Find or create gl_users by auth_provider='telegram' + auth_ref=tg_user_id
  const tgRef = String(tgUser.id);
  let userId: string;
  let displayName: string;

  const { data: existing } = await sb
    .from("gl_users")
    .select("id, display_name")
    .eq("auth_provider", "telegram")
    .eq("auth_ref", tgRef)
    .limit(1)
    .single();

  if (existing) {
    userId = existing.id;
    displayName = existing.display_name;
  } else {
    const name = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : "");
    const { data: newUser, error: createErr } = await sb
      .from("gl_users")
      .insert({
        type: "claimed",
        display_name: name,
        auth_provider: "telegram",
        auth_ref: tgRef,
      })
      .select("id, display_name")
      .single();

    if (createErr || !newUser) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 500 });
    }
    userId = newUser.id;
    displayName = newUser.display_name;
  }

  // If start_param starts with 'grp_', join the group
  let groupId: string | null = null;
  const startParam = verified.start_param;
  if (startParam?.startsWith("grp_")) {
    const tgGroupId = parseInt(startParam.slice(4), 10);
    if (!isNaN(tgGroupId)) {
      const { data: group } = await sb
        .from("gl_groups")
        .select("id")
        .eq("tg_group_id", tgGroupId)
        .limit(1)
        .single();

      if (group) {
        groupId = group.id;
        // Upsert membership — ignore conflict on (group_id, user_id)
        await sb
          .from("gl_group_members")
          .upsert({ group_id: group.id, user_id: userId }, { onConflict: "group_id,user_id" });
      }
    }
  }

  // Generate a simple HMAC-signed token (no external JWT lib needed)
  const tokenSecret = botToken; // reuse bot token as signing secret
  const payload = JSON.stringify({
    sub: userId,
    tg: tgUser.id,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiry
  });
  const sig = createHmac("sha256", tokenSecret).update(payload).digest("hex");
  const token = Buffer.from(payload).toString("base64url") + "." + sig;

  return NextResponse.json({
    token,
    userId,
    displayName,
    ...(groupId ? { groupId } : {}),
  });
}
