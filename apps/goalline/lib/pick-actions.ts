"use server";

import { getServiceSupabase } from "./supabase";

/**
 * GoalLine Daily — Pick submission (spec section 5).
 *
 * Server-authoritative cut-off: compares server_received_at vs card.cutoff_time_utc.
 * NEVER trusts the client clock.
 *
 * One pick per user per card, immutable once confirmed (enforced by DB unique constraint).
 */

type PickSide = "over" | "under";

interface SubmitPickResult {
  pick?: {
    id: string;
    side: PickSide;
    odds_locked: number;
    stake_points: number;
  };
  error?: string;
}

export async function submitPick(
  userId: string,
  cardId: string,
  side: PickSide,
): Promise<SubmitPickResult> {
  if (!userId || !cardId) {
    return { error: "User ID and Card ID are required" };
  }
  if (side !== "over" && side !== "under") {
    return { error: "Side must be 'over' or 'under'" };
  }

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Fetch the card — status + cutoff + odds
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .select("id, status, cutoff_time_utc, over_odds, under_odds")
    .eq("id", cardId)
    .single();

  if (cardErr || !card) {
    return { error: "Card not found" };
  }

  // Reject if card is not open
  if (card.status !== "open") {
    return { error: `Card is ${card.status}, not accepting picks` };
  }

  // Server-authoritative cut-off check (spec section 5)
  const now = new Date();
  const cutoff = new Date(card.cutoff_time_utc);
  if (now >= cutoff) {
    return { error: "Cut-off time has passed" };
  }

  // Lock the odds based on the chosen side
  const oddsLocked = side === "over" ? card.over_odds : card.under_odds;

  // Insert pick — unique constraint (user_id, daily_card_id) prevents duplicates
  const { data: pick, error: insertErr } = await sb
    .from("gl_picks")
    .insert({
      user_id: userId,
      daily_card_id: cardId,
      side,
      stake_points: 100,
      odds_locked: oddsLocked,
      status: "locked",
      server_received_at: now.toISOString(),
    })
    .select("id, side, odds_locked, stake_points")
    .single();

  if (insertErr) {
    // Unique constraint violation = user already picked
    if (insertErr.code === "23505") {
      return { error: "You already have a pick for this card" };
    }
    return { error: insertErr.message };
  }

  return { pick };
}
