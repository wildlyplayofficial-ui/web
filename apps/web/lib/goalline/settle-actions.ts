"use server";

import {
  canSettleEarly,
  computePointsAdded,
  computeProfit,
  isVoidable,
  type MatchForSettlement,
} from "@/lib/goalline/settlement";
import { getServiceSupabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  const { error: updateErr, data: updatedRows } = await sb
    .from("gl_daily_cards")
    .update({
      status: "settled",
      settlement_result: result,
      settled_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .in("status", ["locked", "live"])
    .select("id");

  if (updateErr) return { error: updateErr.message };
  // Guard: if no rows updated, card was already settled (race condition)
  if (!updatedRows || updatedRows.length === 0) return { cardId };

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

    // Populate weekly leaderboard for all users who had picks on this card
    await updateWeeklyLeaderboard(sb, cardId);
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

// ── Weekly Leaderboard ────────────────────────────────────────────────────────

/** Get Mon-Sun UTC boundaries for a given date. */
function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + mondayOffset);
  const monStr = mon.toISOString().slice(0, 10);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const sunStr = sun.toISOString().slice(0, 10);
  return { start: monStr, end: sunStr };
}

/**
 * After settling a card, recompute weekly leaderboard for all users
 * who had picks on that card. Upserts into gl_weekly_leaderboard.
 */
async function updateWeeklyLeaderboard(
  sb: SupabaseClient,
  cardId: string,
): Promise<void> {
  const { start, end } = getWeekBounds(new Date());

  // Get all settled picks this week (won/lost) with their card dates
  const { data: weekPicks } = await sb
    .from("gl_picks")
    .select(`
      user_id,
      status,
      points_added,
      daily_card_id,
      gl_daily_cards!inner (utc_date)
    `)
    .in("status", ["won", "lost"])
    .gte("gl_daily_cards.utc_date", start)
    .lte("gl_daily_cards.utc_date", end);

  if (!weekPicks || weekPicks.length === 0) return;

  // Aggregate per user
  interface PickRow {
    user_id: string;
    status: string;
    points_added: number | null;
    daily_card_id: string;
    gl_daily_cards: { utc_date: string } | { utc_date: string }[];
  }

  const userStats = new Map<string, {
    score: number;
    winDays: Set<string>;
    participationDays: Set<string>;
  }>();

  for (const row of weekPicks as unknown as PickRow[]) {
    const cardInfo = Array.isArray(row.gl_daily_cards)
      ? row.gl_daily_cards[0]
      : row.gl_daily_cards;
    const utcDate = cardInfo?.utc_date ?? "";

    const existing = userStats.get(row.user_id) ?? {
      score: 0,
      winDays: new Set<string>(),
      participationDays: new Set<string>(),
    };

    existing.score += row.points_added ?? 0;
    existing.participationDays.add(utcDate);
    if (row.status === "won") existing.winDays.add(utcDate);
    userStats.set(row.user_id, existing);
  }

  // Calculate streak for each user (consecutive days with picks ending today/yesterday)
  function calcStreak(days: Set<string>): number {
    const sorted = [...days].sort().reverse();
    if (sorted.length === 0) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.5) streak++;
      else break;
    }
    return streak;
  }

  // Rank by score descending
  const entries = [...userStats.entries()]
    .map(([userId, stats]) => ({
      user_id: userId,
      week_start_utc: start,
      week_end_utc: end,
      score: Math.round(stats.score * 100) / 100,
      winning_days: stats.winDays.size,
      participation_days: stats.participationDays.size,
      current_streak: calcStreak(stats.participationDays),
    }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  // Upsert all entries
  for (const entry of entries) {
    await sb
      .from("gl_weekly_leaderboard")
      .upsert(entry, { onConflict: "user_id,week_start_utc" });
  }
}
