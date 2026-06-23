import { NextResponse, type NextRequest } from "next/server";
import { submitPick } from "@/lib/pick-actions";

/**
 * POST /api/pick — Submit a pick for a GoalLine Daily card.
 *
 * Body: { userId: string, cardId: string, side: "over" | "under" }
 *
 * Server-authoritative cut-off validation (spec section 5).
 * Returns the created pick or an error message.
 */
export async function POST(request: NextRequest) {
  let body: { userId?: string; cardId?: string; side?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { userId, cardId, side } = body;

  if (!userId || !cardId || !side) {
    return NextResponse.json(
      { error: "userId, cardId, and side are required" },
      { status: 400 },
    );
  }

  if (side !== "over" && side !== "under") {
    return NextResponse.json(
      { error: "side must be 'over' or 'under'" },
      { status: 400 },
    );
  }

  const result = await submitPick(userId, cardId, side);

  if (result.error) {
    // Distinguish client errors from server errors
    const status = result.error.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ pick: result.pick }, { status: 201 });
}
