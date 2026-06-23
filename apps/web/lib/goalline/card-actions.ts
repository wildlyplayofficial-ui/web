"use server";

import { getServiceSupabase } from "./supabase";
import { deriveLineForMatches } from "./line-engine";

/**
 * GoalLine Daily — Card lifecycle actions (spec sections 3, 4).
 *
 * Admin server actions for: create, publish, lock.
 * Settle + void live in settle-actions.ts (split to keep files < 300 lines).
 * All use the service-role Supabase client for writes.
 */

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
  const derived = await deriveLineForMatches(matchIds.map((id) => ({ id, homeTeam: "", awayTeam: "", kickoffUtc: "" })));
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

// ── Create Card Manual ────────────────────────────────────────────────────

interface MatchInput {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
}

/**
 * Create a card with manually specified line + odds.
 * Accepts match objects directly (from the picker) — no re-fetch needed.
 */
export async function createCardManual(
  date: string,
  matchInputs: MatchInput[],
  goalLine: number,
  overOdds: number,
  underOdds: number,
): Promise<ActionResult> {
  if (matchInputs.length !== 3) return { error: "Exactly 3 matches required" };
  if (goalLine % 1 !== 0.5) return { error: "Goal line must end in .5 (no push)" };
  if (overOdds < 1.01 || underOdds < 1.01) return { error: "Odds must be > 1.00" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Guard: reject if a non-voided card already exists for this date
  const { data: existing } = await sb
    .from("gl_daily_cards")
    .select("id")
    .eq("utc_date", date)
    .neq("status", "voided")
    .limit(1)
    .single();
  if (existing) return { error: "A card already exists for this date" };

  // Upsert matches into gl_matches
  for (const m of matchInputs) {
    await sb.from("gl_matches").upsert({
      external_match_id: m.id,
      home_team: m.homeTeam,
      away_team: m.awayTeam,
      kickoff_time_utc: m.kickoffUtc,
      status: "scheduled",
      home_score: 0,
      away_score: 0,
      valid_goals: 0,
      is_valid_for_settlement: true,
    }, { onConflict: "external_match_id" });
  }

  // Get match DB IDs
  const { data: dbMatches } = await sb
    .from("gl_matches")
    .select("id, external_match_id, kickoff_time_utc")
    .in("external_match_id", matchInputs.map((m) => m.id));

  if (!dbMatches || dbMatches.length !== 3) return { error: "Failed to upsert matches" };

  // Card number
  const { data: lastCard } = await sb
    .from("gl_daily_cards")
    .select("card_number")
    .order("card_number", { ascending: false })
    .limit(1)
    .single();
  const cardNumber = (lastCard?.card_number ?? 0) + 1;

  // Cutoff
  const kickoffs = dbMatches.map((m: { kickoff_time_utc: string }) => new Date(m.kickoff_time_utc).getTime());
  const cutoffTime = new Date(Math.min(...kickoffs) - 2 * 60 * 1000);

  // Create card
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .insert({
      card_number: cardNumber,
      utc_date: date,
      goal_line: goalLine,
      over_odds: overOdds,
      under_odds: underOdds,
      cutoff_time_utc: cutoffTime.toISOString(),
      status: "draft",
      method_note: "Line set from real bookmaker totals, de-vigged and calibrated to ~50/50.",
    })
    .select("id")
    .single();

  if (cardErr || !card) return { error: cardErr?.message ?? "Failed to create card" };

  // Link matches
  const junctions = dbMatches.map((m: { id: string }, i: number) => ({
    daily_card_id: card.id as string,
    match_id: m.id,
    sort_order: i,
  }));
  const { error: jErr } = await sb.from("gl_daily_card_matches").insert(junctions);
  if (jErr) return { error: jErr.message };

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
