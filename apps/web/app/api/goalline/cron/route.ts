import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import { deriveLineForMatches } from "@/lib/goalline/line-engine";
import { lockCard } from "@/lib/goalline/card-actions";
import { settleCardAction, voidCard } from "@/lib/goalline/settle-actions";
import {
  fetchLiveMatchMap,
  fetchFixtureMap,
  syncMatchScores,
  WC_COMPETITION_ID,
} from "@/lib/goalline/cron-helpers";
import { lsFetch } from "@/lib/ls-fetch";

/**
 * POST /api/goalline/cron
 *
 * Full lifecycle cron — runs every 15 minutes via Vercel Cron.
 * Protected by x-revalidate-secret header.
 *
 * Steps:
 * 1. Auto-create tomorrow's card (if not exists + ≥3 matches + odds available)
 * 2. Auto-lock open cards past cutoff_time_utc
 * 3. Auto-settle locked/live cards when all matches finished (or Over clinched)
 */

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
const MIN_LINE = 1.5;
const MAX_LINE = 12.5;
const MIN_ODDS = 1.3;
const MAX_ODDS = 4.0;

interface LivescoreFixture {
  id: string;
  fixture_id: string;
  home_name: string;
  away_name: string;
  date: string;
  time: string;
  status: string;
}

type Sb = NonNullable<ReturnType<typeof getServiceSupabase>>;

// ── Step 1: Auto-Create Tomorrow's Card ─────────────────────────────────────

async function autoCreate(
  sb: Sb,
  lsKey: string,
  lsSecret: string,
): Promise<{ done: boolean; reason: string; cardId?: string }> {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data: existing } = await sb
    .from("gl_daily_cards")
    .select("id")
    .eq("utc_date", tomorrow)
    .neq("status", "voided")
    .limit(1)
    .single();
  if (existing) return { done: false, reason: `Card already exists for ${tomorrow}` };

  // Fetch tomorrow's WC fixtures
  const res = await lsFetch(
    `${LIVESCORE_BASE}/fixtures/matches.json?key=${lsKey}&secret=${lsSecret}&competition_id=${WC_COMPETITION_ID}&date=${tomorrow}`,
    { cache: "no-store" },
  );
  const lsData = await res.json() as { success: boolean; data?: { fixtures?: LivescoreFixture[] } };
  const fixtures: LivescoreFixture[] = lsData.success ? (lsData.data?.fixtures ?? []) : [];

  const upcoming = fixtures.filter((f) => {
    const s = (f.status || "").toUpperCase();
    return s !== "FINISHED" && s !== "FT" && s !== "CANCELLED" && s !== "POSTPONED";
  });
  if (upcoming.length < 3) {
    return { done: false, reason: `Only ${upcoming.length} WC matches on ${tomorrow}, need ≥3` };
  }

  const picked = [...upcoming].sort(() => Math.random() - 0.5).slice(0, 3);
  const matchInputs = picked.map((f) => ({
    id: f.fixture_id || f.id,
    homeTeam: f.home_name,
    awayTeam: f.away_name,
    kickoffUtc: f.date && f.time ? `${f.date}T${f.time}Z` : "",
  }));

  const derived = await deriveLineForMatches(matchInputs);
  if (!derived) return { done: false, reason: "No odds data — cannot derive line" };

  // Guardrails
  if (derived.goalLine < MIN_LINE || derived.goalLine > MAX_LINE) {
    return { done: false, reason: `Line ${derived.goalLine} outside range [${MIN_LINE}-${MAX_LINE}]` };
  }
  if (
    derived.overOdds < MIN_ODDS || derived.overOdds > MAX_ODDS ||
    derived.underOdds < MIN_ODDS || derived.underOdds > MAX_ODDS
  ) {
    return { done: false, reason: `Odds ${derived.overOdds}/${derived.underOdds} out of range` };
  }

  // Upsert matches
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

  const { data: dbMatches } = await sb
    .from("gl_matches")
    .select("id, external_match_id, kickoff_time_utc")
    .in("external_match_id", matchInputs.map((m) => m.id));
  if (!dbMatches || dbMatches.length !== 3) {
    return { done: false, reason: "Failed to upsert matches into DB" };
  }

  const { data: lastCard } = await sb
    .from("gl_daily_cards")
    .select("card_number")
    .order("card_number", { ascending: false })
    .limit(1)
    .single();
  const cardNumber = (lastCard?.card_number ?? 0) + 1;

  const kickoffs = (dbMatches as { kickoff_time_utc: string }[]).map(
    (m) => new Date(m.kickoff_time_utc).getTime(),
  );
  const cutoffTime = new Date(Math.min(...kickoffs) - 2 * 60 * 1000);

  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .insert({
      card_number: cardNumber,
      utc_date: tomorrow,
      goal_line: derived.goalLine,
      over_odds: derived.overOdds,
      under_odds: derived.underOdds,
      cutoff_time_utc: cutoffTime.toISOString(),
      status: "open",
      published_at: new Date().toISOString(),
      method_note: "Auto-created by cron. Line derived from Sbobet totals, de-vigged ~50/50.",
    })
    .select("id")
    .single();
  if (cardErr || !card) return { done: false, reason: cardErr?.message ?? "Failed to create card" };

  await sb.from("gl_daily_card_matches").insert(
    (dbMatches as { id: string }[]).map((m, i) => ({
      daily_card_id: card.id as string,
      match_id: m.id,
      sort_order: i,
    })),
  );

  return {
    done: true,
    cardId: card.id as string,
    reason: `Card #${cardNumber} for ${tomorrow}: ${matchInputs.map((m) => `${m.homeTeam} vs ${m.awayTeam}`).join(", ")}`,
  };
}

// ── Step 2: Auto-Lock Past-Cutoff Cards ─────────────────────────────────────

async function autoLock(sb: Sb): Promise<string[]> {
  const { data: openCards } = await sb
    .from("gl_daily_cards")
    .select("id")
    .eq("status", "open")
    .lt("cutoff_time_utc", new Date().toISOString());
  if (!openCards?.length) return [];

  const locked: string[] = [];
  for (const card of openCards as { id: string }[]) {
    const r = await lockCard(card.id);
    if (!r.error) locked.push(card.id);
  }
  return locked;
}

// ── Step 3: Auto-Settle Locked/Live Cards ───────────────────────────────────

async function autoSettle(
  sb: Sb,
  lsKey: string,
  lsSecret: string,
): Promise<{ settled: string[]; voided: string[]; skipped: string[] }> {
  const settled: string[] = [];
  const voided: string[] = [];
  const skipped: string[] = [];

  const { data: activeCards } = await sb
    .from("gl_daily_cards")
    .select("id, goal_line, utc_date")
    .in("status", ["locked", "live"]);
  if (!activeCards?.length) return { settled, voided, skipped };

  // Fetch live feed once for all cards
  const liveMap = await fetchLiveMatchMap(lsKey, lsSecret);

  for (const card of activeCards as { id: string; goal_line: number; utc_date: string }[]) {
    const { data: junctions } = await sb
      .from("gl_daily_card_matches")
      .select("match_id")
      .eq("daily_card_id", card.id);
    if (!junctions?.length) { skipped.push(card.id); continue; }

    const matchIds = (junctions as { match_id: string }[]).map((j) => j.match_id);
    const { data: dbMatches } = await sb
      .from("gl_matches")
      .select("id, external_match_id, status, home_score, away_score, kickoff_time_utc")
      .in("id", matchIds);
    if (!dbMatches?.length) { skipped.push(card.id); continue; }

    // Fixture feed for finished matches not in live feed
    const fixtureMap = await fetchFixtureMap(lsKey, lsSecret, card.utc_date);

    const { allFinished, hasVoidable, totalGoals } = await syncMatchScores(
      sb,
      dbMatches as { id: string; external_match_id: string; status: string; home_score: number | null; away_score: number | null; kickoff_time_utc?: string }[],
      liveMap,
      fixtureMap,
    );

    // NEVER settle while any match is still live — scores can change (VAR, disallowed goals).
    // Only settle when ALL matches are verified finished.

    // Voidable + not all finished → void (postponed/abandoned match)
    if (hasVoidable && !allFinished) {
      // Only void if Over is NOT clinched with finished-only scores
      const finishedGoals = (dbMatches as { status: string; home_score: number | null; away_score: number | null }[])
        .filter((m) => m.status === "finished")
        .reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
      if (finishedGoals <= card.goal_line) {
        const r = await voidCard(card.id, "Match postponed or abandoned");
        if (!r.error) { voided.push(card.id); continue; }
      }
    }

    // All finished → settle (safe: scores are final)
    if (allFinished) {
      const r = await settleCardAction(card.id);
      if (!r.error) { settled.push(card.id); continue; }
    }

    skipped.push(card.id);
  }

  return { settled, voided, skipped };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  const expected = process.env.REVALIDATE_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const lsKey = process.env.LIVESCORE_API_KEY;
  const lsSecret = process.env.LIVESCORE_API_SECRET;
  if (!lsKey || !lsSecret) {
    return NextResponse.json({ error: "Livescore credentials missing" }, { status: 503 });
  }

  // Run all three steps concurrently (they operate on different card statuses)
  const [createResult, lockedIds, settleResult] = await Promise.all([
    autoCreate(sb, lsKey, lsSecret),
    autoLock(sb),
    autoSettle(sb, lsKey, lsSecret),
  ]);

  return NextResponse.json({
    ok: true,
    create: createResult,
    locked: lockedIds,
    settle: settleResult,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "goalline-cron" });
}
