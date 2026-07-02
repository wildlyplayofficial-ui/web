import { NextResponse, type NextRequest } from "next/server";
import { createHash, createHmac } from "crypto";
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
  let body: { initData?: string; gameMode?: boolean; userId?: string; displayName?: string; chatId?: string | null; inlineMessageId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const botToken = process.env.TMA_BOT_TOKEN ?? process.env.CURATOR_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 503 });
  }

  // Games API mode: user info passed directly from webhook callback (no initData)
  if (body.gameMode && body.userId) {
    return handleGameMode(body.userId, body.displayName ?? "Player", body.chatId ?? null, body.inlineMessageId ?? null, botToken);
  }

  const { initData } = body;
  if (!initData) {
    return NextResponse.json({ error: "initData is required" }, { status: 400 });
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

/**
 * Map an inline_message_id to a stable synthetic tg_group_id.
 * Inline cards have no chat context (Telegram limitation), so everyone who taps
 * Play on the SAME shared card lands in the same synthetic "group".
 * Range ≈ -4.0e15 .. -4.3e15 — far below real Telegram chat ids (≈ -1e13),
 * and within Number.MAX_SAFE_INTEGER.
 */
function imidToGroupKey(imid: string): number {
  const n = createHash("sha256").update(imid).digest().readUIntBE(0, 6); // 0..2^48
  return -(4_000_000_000_000_000 + n);
}

// Games API auth: find-or-create user by Telegram ID (no initData verification)
async function handleGameMode(tgId: string, name: string, chatId: string | null, inlineMessageId: string | null, botToken: string) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let userId: string;
  let displayName: string;

  const { data: existing } = await sb
    .from("gl_users")
    .select("id, display_name")
    .eq("auth_provider", "telegram")
    .eq("auth_ref", tgId)
    .limit(1)
    .single();

  if (existing) {
    userId = existing.id;
    displayName = existing.display_name;
  } else {
    const { data: newUser, error: createErr } = await sb
      .from("gl_users")
      .insert({
        type: "claimed",
        display_name: name,
        auth_provider: "telegram",
        auth_ref: tgId,
      })
      .select("id, display_name")
      .single();

    if (createErr || !newUser) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 500 });
    }
    userId = newUser.id;
    displayName = newUser.display_name;
  }

  // Look up or create gl_groups entry, add user as member.
  // Group key: real chat id (group sendGame cards) or synthetic id derived
  // from inline_message_id (inline cards — shared card = shared board).
  let groupId: string | null = null;
  let tgGroupId: number | null = null;
  let title = "";
  const numericChatId = Number(chatId);
  if (chatId && !isNaN(numericChatId) && numericChatId !== 0) {
    tgGroupId = numericChatId;
    title = `Group ${tgGroupId}`;
  } else if (inlineMessageId) {
    tgGroupId = imidToGroupKey(inlineMessageId);
    title = `Card ${inlineMessageId.slice(0, 12)}`;
  }

  if (tgGroupId !== null) {
    const { data: group } = await sb
      .from("gl_groups")
      .select("id")
      .eq("tg_group_id", tgGroupId)
      .limit(1)
      .single();

    if (group) {
      groupId = group.id;
    } else {
      // Auto-create group (title updated later via webhook if needed)
      const { data: newGroup } = await sb
        .from("gl_groups")
        .insert({ tg_group_id: tgGroupId, title, created_by_tg: Number(tgId) })
        .select("id")
        .single();
      if (newGroup) {
        groupId = newGroup.id;
      } else {
        // Lost a concurrent-create race (unique tg_group_id) — re-select
        const { data: retry } = await sb
          .from("gl_groups")
          .select("id")
          .eq("tg_group_id", tgGroupId)
          .limit(1)
          .single();
        if (retry) groupId = retry.id;
      }
    }

    if (groupId) {
      await sb
        .from("gl_group_members")
        .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
    }
  }

  const tokenSecret = botToken;
  const payload = JSON.stringify({
    sub: userId,
    tg: Number(tgId),
    exp: Math.floor(Date.now() / 1000) + 86400,
  });
  const sig = createHmac("sha256", tokenSecret).update(payload).digest("hex");
  const token = Buffer.from(payload).toString("base64url") + "." + sig;

  return NextResponse.json({ token, userId, displayName, ...(groupId ? { groupId } : {}) });
}
