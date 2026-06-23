"use server";

import { getServiceSupabase } from "./supabase";
import { deriveLineFromMatches } from "./line-engine";

/**
 * GoalLine Daily — Card lifecycle actions (spec sections 3, 4).
 *
 * Admin server actions for: create, publish, lock.
 * Settle + void live in settle-actions.ts (split to keep files < 300 lines).
 * All use the service-role Supabase client for writes.
 */

export { settleCardAction as settleCard, voidCard } from "./settle-actions";

interface ActionResult {
  error?: string;
  cardId?: string;
}

// ── Create Card ─────────────────────────────────────────────────────────────

/**
 * Create a draft card for a given date with 3 matches.
 * Derives the goal line + odds from odds-api.io automatically.
 *
 * matchIds = external_match_id values (odds-api event IDs).
 */
export async function createCard(
  date: string,
  matchIds: string[],
): Promise<ActionResult> {
  if (matchIds.length !== 3) {
    return { error: "Exactly 3 matches required" };
  }

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Derive line + odds from odds-api
  const derived = await deriveLineFromMatches(matchIds);
  if (!derived) {
    return { error: "Could not derive line — odds data unavailable" };
  }

  // Get the next card number
  const { data: lastCard } = await sb
    .from("gl_daily_cards")
    .select("card_number")
    .order("card_number", { ascending: false })
    .limit(1)
    .single();

  const cardNumber = (lastCard?.card_number ?? 0) + 1;

  // Fetch the matches from DB (must exist already)
  const { data: matches, error: matchErr } = await sb
    .from("gl_matches")
    .select("id, external_match_id, kickoff_time_utc")
    .in("external_match_id", matchIds);

  if (matchErr || !matches || matches.length !== 3) {
    return { error: "Not all matches found in database" };
  }

  // Cut-off = earliest kickoff minus 2 minutes (spec section 5)
  const kickoffs = matches.map(
    (m: { id: string; external_match_id: string; kickoff_time_utc: string }) =>
      new Date(m.kickoff_time_utc).getTime(),
  );
  const earliestKickoff = Math.min(...kickoffs);
  const cutoffTime = new Date(earliestKickoff - 2 * 60 * 1000);

  // Create the card
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .insert({
      card_number: cardNumber,
      utc_date: date,
      goal_line: derived.goalLine,
      over_odds: derived.overOdds,
      under_odds: derived.underOdds,
      cutoff_time_utc: cutoffTime.toISOString(),
      status: "draft",
      method_note:
        "Line set from real bookmaker totals, de-vigged and calibrated to ~50/50.",
    })
    .select("id")
    .single();

  if (cardErr || !card) {
    return { error: cardErr?.message ?? "Failed to create card" };
  }

  // Link matches to card
  const junctions = matches.map(
    (m: { id: string; external_match_id: string; kickoff_time_utc: string }, i: number) => ({
      daily_card_id: card.id as string,
      match_id: m.id,
      sort_order: i,
    }),
  );

  const { error: junctionErr } = await sb
    .from("gl_daily_card_matches")
    .insert(junctions);

  if (junctionErr) {
    return { error: junctionErr.message };
  }

  return { cardId: card.id };
}

// ── Publish Card ────────────────────────────────────────────────────────────

/** Move card from draft to open (skipping scheduled for MVP). */
export async function publishCard(cardId: string): Promise<ActionResult> {
  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data: card, error: fetchErr } = await sb
    .from("gl_daily_cards")
    .select("status")
    .eq("id", cardId)
    .single();

  if (fetchErr || !card) return { error: "Card not found" };
  if (card.status !== "draft" && card.status !== "scheduled") {
    return { error: `Cannot publish card in '${card.status}' status` };
  }

  const { error } = await sb
    .from("gl_daily_cards")
    .update({
      status: "open",
      published_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (error) return { error: error.message };
  return { cardId };
}

// ── Lock Card ───────────────────────────────────────────────────────────────

/** Lock an open card — no more picks accepted. */
export async function lockCard(cardId: string): Promise<ActionResult> {
  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data: card, error: fetchErr } = await sb
    .from("gl_daily_cards")
    .select("status")
    .eq("id", cardId)
    .single();

  if (fetchErr || !card) return { error: "Card not found" };
  if (card.status !== "open") {
    return { error: `Cannot lock card in '${card.status}' status` };
  }

  const { error } = await sb
    .from("gl_daily_cards")
    .update({
      status: "locked",
      locked_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (error) return { error: error.message };
  return { cardId };
}
