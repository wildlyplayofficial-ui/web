import { NextResponse, type NextRequest } from "next/server";
import { submitPick } from "@/lib/goalline/pick-actions";
import { getServiceSupabase } from "@/lib/goalline/supabase";

const ANIMALS = [
  "Penguin", "Hedgehog", "Otter", "Panda", "Koala", "Fox", "Owl",
  "Dolphin", "Tiger", "Bear", "Wolf", "Eagle", "Lion", "Rabbit",
  "Turtle", "Falcon", "Seal", "Lynx", "Raven", "Jaguar",
];

function generateFunName(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `Anonymous ${animal}`;
}

/**
 * POST /api/goalline/pick — Submit a pick for a GoalLine Daily card.
 *
 * Body: { deviceId: string, displayName?: string, cardId: string, side: "over" | "under" }
 *   OR: { userId: string, cardId: string, side: "over" | "under" }  (TMA flow)
 *
 * Creates guest user if needed (by device_id), then submits pick.
 * TMA flow: userId provided directly, skips device_id lookup.
 */
export async function POST(request: NextRequest) {
  let body: { deviceId?: string; userId?: string; displayName?: string; cardId?: string; side?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, userId: tmaUserId, displayName, cardId, side } = body;

  if (!cardId || !side) {
    return NextResponse.json({ error: "cardId and side are required" }, { status: 400 });
  }
  if (!deviceId && !tmaUserId) {
    return NextResponse.json({ error: "deviceId or userId is required" }, { status: 400 });
  }
  if (side !== "over" && side !== "under") {
    return NextResponse.json({ error: "side must be 'over' or 'under'" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let userId: string;

  if (tmaUserId) {
    // TMA flow: userId provided directly
    userId = tmaUserId;
  } else {
    // Guest flow: find or create by device_id (service-role bypasses RLS)
    const { data: existing } = await sb
      .from("gl_users")
      .select("id")
      .eq("device_id", deviceId!)
      .limit(1)
      .single();

    if (existing) {
      userId = existing.id;
    } else {
      const funName = generateFunName();
      const { data: newUser, error: createErr } = await sb
        .from("gl_users")
        .insert({
          type: "guest",
          display_name: funName,
          device_id: deviceId,
        })
        .select("id")
        .single();

      if (createErr || !newUser) {
        return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    }
  }

  // Double-pick check: look up the card's line_id to verify no existing pick
  // from BOTH this userId AND any linked deviceId for the same card
  const { data: card } = await sb
    .from("gl_daily_cards")
    .select("id")
    .eq("id", cardId)
    .single();

  if (card) {
    // Check for existing pick by this userId
    const { data: existingPick } = await sb
      .from("gl_picks")
      .select("id")
      .eq("daily_card_id", cardId)
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (existingPick) {
      return NextResponse.json({ error: "You already have a pick for this card" }, { status: 400 });
    }

    // Cross-check: if TMA user also has a device_id, check that device's user too
    if (tmaUserId) {
      const { data: tmaUser } = await sb
        .from("gl_users")
        .select("device_id")
        .eq("id", tmaUserId)
        .single();

      if (tmaUser?.device_id) {
        const { data: deviceUser } = await sb
          .from("gl_users")
          .select("id")
          .eq("device_id", tmaUser.device_id)
          .neq("id", tmaUserId)
          .limit(1)
          .single();

        if (deviceUser) {
          const { data: linkedPick } = await sb
            .from("gl_picks")
            .select("id")
            .eq("daily_card_id", cardId)
            .eq("user_id", deviceUser.id)
            .limit(1)
            .single();

          if (linkedPick) {
            return NextResponse.json({ error: "A pick already exists for this card from a linked account" }, { status: 400 });
          }
        }
      }
    }
  }

  const result = await submitPick(userId, cardId, side);

  if (result.error) {
    const status = result.error.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ pick: result.pick }, { status: 201 });
}
