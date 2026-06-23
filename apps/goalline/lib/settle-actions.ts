"use server";

import {
  canSettleEarly,
  computePointsAdded,
  computeProfit,
  isVoidable,
  type MatchForSettlement,
} from "@wildlyplay/goalline-settlement";
import { getServiceSupabase } from "./supabase";

/**
 * GoalLine Daily — Settlement + Void actions (spec section 6).
 *
 * Separated from card-actions.ts to keep files under 300 lines.
 */

const PARTICIPATION_BONUS = 5;

interface ActionResult {
  error?: string;
  cardId?: string;
}

// ── Settle Card ─────────────────────────────────────────────────────────────

/**
 * Settle a card: compute total goals, determine result, settle all picks,
 * update user stats. Handles void scenario per spec section 6.
 */
export async function settleCardAction(cardId: string): Promise<ActionResult> {
  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Fetch card
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .select("id, goal_line, status, over_odds, under_odds")
    .eq("id", cardId)
    .single();

  if (cardErr || !card) return { error: "Card not found" };
  if (card.status !== "locked" && card.status !== "live") {
    return { error: `Cannot settle card in '${card.status}' status` };
  }

  // Fetch linked matches
  const { data: junctions } = await sb
    .from("gl_daily_card_matches")
    .select("match_id")
    .eq("daily_card_id", cardId);

  if (!junctions || junctions.length === 0) {
    return { error: "No matches linked to card" };
  }

  const matchIds = junctions.map((j: { match_id: string }) => j.match_id);
  const { data: matches, error: matchErr } = await sb
    .from("gl_matches")
    .select("id, status, valid_goals, is_valid_for_settlement")
    .in("id", matchIds);

  if (matchErr || !matches) return { error: "Failed to fetch matches" };

  // Build settlement data
  interface MatchRow {
    id: string;
    status: string;
    valid_goals: number | null;
    is_valid_for_settlement: boolean;
  }
  const settlementMatches: MatchForSettlement[] = (matches as MatchRow[]).map(
    (m) => ({
      status: m.status as MatchForSettlement["status"],
      validGoals: m.valid_goals ?? 0,
      isValidForSettlement: m.is_valid_for_settlement,
    }),
  );

  const totalGoals = settlementMatches.reduce(
    (sum, m) => sum + m.validGoals,
    0,
  );
  const allComplete = settlementMatches.every(
    (m) => m.status === "finished",
  );

  // Check for void condition (spec section 6)
  if (isVoidable(settlementMatches)) {
    // Unless Over is already clinched
    if (totalGoals > card.goal_line) {
      // Over clinched despite voidable match — settle as Over
    } else {
      return voidCard(cardId, "Match postponed or abandoned");
    }
  }

  // Check if we can settle
  const earlyCheck = canSettleEarly(
    totalGoals,
    card.goal_line,
    allComplete,
  );
  if (!earlyCheck.canSettle || !earlyCheck.result) {
    return { error: "Not all conditions met for settlement" };
  }

  const result = earlyCheck.result;

  // Update card — conditional on status to prevent double-settle
  const { error: updateErr, count } = await sb
    .from("gl_daily_cards")
    .update({
      status: "settled",
      settlement_result: result,
      settled_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .in("status", ["locked", "live"])
    .select("id", { count: "exact", head: true });

  if (updateErr) return { error: updateErr.message };
  // Guard: if no rows updated, card was already settled (race condition)
  if (count === 0) return { cardId };

  // Settle all picks for this card
  const { data: picks } = await sb
    .from("gl_picks")
    .select("id, user_id, side, stake_points, odds_locked")
    .eq("daily_card_id", cardId)
    .eq("status", "locked");

  if (picks && picks.length > 0) {
    for (const pick of picks) {
      const won = pick.side === result;
      const netProfit = computeProfit(won, pick.stake_points, pick.odds_locked);
      const pickStatus = won ? "won" : "lost";
      const pointsAdded = computePointsAdded(
        pickStatus,
        pick.stake_points,
        pick.odds_locked,
        PARTICIPATION_BONUS,
      );

      await sb
        .from("gl_picks")
        .update({
          status: pickStatus,
          net_profit: netProfit,
          participation_bonus: PARTICIPATION_BONUS,
          points_added: pointsAdded,
          settled_at: new Date().toISOString(),
        })
        .eq("id", pick.id);

      // Update user stats
      await sb.rpc("gl_update_user_stats_on_settle", {
        p_user_id: pick.user_id,
        p_won: won,
      });
    }
  }

  return { cardId };
}

// ── Void Card ───────────────────────────────────────────────────────────────

/** Void a card and refund all picks (spec section 6). */
export async function voidCard(
  cardId: string,
  reason: string,
): Promise<ActionResult> {
  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Update card status
  const { error: updateErr } = await sb
    .from("gl_daily_cards")
    .update({
      status: "voided",
      void_reason: reason,
      settled_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (updateErr) return { error: updateErr.message };

  // Void all locked picks — refund (points_added = 0, spec section 9)
  const { error: pickErr } = await sb
    .from("gl_picks")
    .update({
      status: "void",
      net_profit: 0,
      points_added: 0,
      settled_at: new Date().toISOString(),
    })
    .eq("daily_card_id", cardId)
    .eq("status", "locked");

  if (pickErr) return { error: pickErr.message };

  return { cardId };
}
