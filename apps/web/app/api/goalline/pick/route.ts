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
 *
 * Creates guest user if needed (by device_id), then submits pick.
 */
export async function POST(request: NextRequest) {
  let body: { deviceId?: string; displayName?: string; cardId?: string; side?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, displayName, cardId, side } = body;

  if (!deviceId || !cardId || !side) {
    return NextResponse.json({ error: "deviceId, cardId, and side are required" }, { status: 400 });
  }
  if (side !== "over" && side !== "under") {
    return NextResponse.json({ error: "side must be 'over' or 'under'" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  // Find or create guest user by device_id (service-role bypasses RLS)
  let userId: string;
  const { data: existing } = await sb
    .from("gl_users")
    .select("id")
    .eq("device_id", deviceId)
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

  const result = await submitPick(userId, cardId, side);

  if (result.error) {
    const status = result.error.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ pick: result.pick }, { status: 201 });
}
