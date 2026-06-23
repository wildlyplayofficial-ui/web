import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/goalline/supabase";
import { fetchWcEvents, deriveLineForMatches } from "@/lib/goalline/line-engine";

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
const WC_COMPETITION_ID = 362;

// Guardrails per spec + Jane review
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

/**
 * POST /api/goalline/auto-create — fully automatic card creation.
 * Cron or manual trigger. Picks 3 random upcoming WC matches,
 * derives line + odds, creates + publishes card.
 *
 * Protected by secret header to prevent public abuse.
 */
export async function POST(request: Request) {
  // Auth: require revalidate secret or service header
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

  // Target date = tomorrow UTC
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Check if card already exists for tomorrow
  const { data: existing } = await sb
    .from("gl_daily_cards")
    .select("id")
    .eq("utc_date", tomorrow)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ skip: true, reason: `Card already exists for ${tomorrow}` });
  }

  // Fetch tomorrow's WC fixtures from livescore
  const lsRes = await fetch(
    `${LIVESCORE_BASE}/fixtures/matches.json?key=${lsKey}&secret=${lsSecret}&competition_id=${WC_COMPETITION_ID}&date=${tomorrow}`,
    { cache: "no-store" },
  );
  const lsData = await lsRes.json();
  const fixtures: LivescoreFixture[] = lsData.success && lsData.data?.fixtures
    ? lsData.data.fixtures
    : [];

  // Filter upcoming only
  const upcoming = fixtures.filter((f) => {
    const s = (f.status || "").toUpperCase();
    return s !== "FINISHED" && s !== "FT" && s !== "CANCELLED";
  });

  if (upcoming.length < 3) {
    return NextResponse.json({ skip: true, reason: `Only ${upcoming.length} WC matches on ${tomorrow}, need 3` });
  }

  // Random pick 3
  const shuffled = [...upcoming].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3);

  const matchInputs = picked.map((f) => ({
    id: f.fixture_id || f.id,
    homeTeam: f.home_name,
    awayTeam: f.away_name,
    kickoffUtc: f.date && f.time ? `${f.date}T${f.time}Z` : "",
  }));

  // Try auto derive line + odds
  const derived = await deriveLineForMatches(matchInputs);

  let goalLine: number;
  let overOdds: number;
  let underOdds: number;

  if (!derived) {
    return NextResponse.json({ skip: true, reason: "No odds data — cannot derive line. Skipping (no fallback in auto mode)." });
  }

  goalLine = derived.goalLine;
  overOdds = derived.overOdds;
  underOdds = derived.underOdds;

  // Guardrails
  if (goalLine < MIN_LINE || goalLine > MAX_LINE) {
    return NextResponse.json({ skip: true, reason: `Derived line ${goalLine} outside range [${MIN_LINE}-${MAX_LINE}]` });
  }
  if (overOdds < MIN_ODDS || overOdds > MAX_ODDS || underOdds < MIN_ODDS || underOdds > MAX_ODDS) {
    return NextResponse.json({ skip: true, reason: `Derived odds ${overOdds}/${underOdds} outside range [${MIN_ODDS}-${MAX_ODDS}]` });
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

  // Get DB match IDs
  const { data: dbMatches } = await sb
    .from("gl_matches")
    .select("id, external_match_id, kickoff_time_utc")
    .in("external_match_id", matchInputs.map((m) => m.id));

  if (!dbMatches || dbMatches.length !== 3) {
    return NextResponse.json({ error: "Failed to upsert matches" }, { status: 500 });
  }

  // Card number
  const { data: lastCard } = await sb
    .from("gl_daily_cards")
    .select("card_number")
    .order("card_number", { ascending: false })
    .limit(1)
    .single();
  const cardNumber = (lastCard?.card_number ?? 0) + 1;

  // Cutoff = earliest KO - 2 min
  const kickoffs = dbMatches.map((m: { kickoff_time_utc: string }) =>
    new Date(m.kickoff_time_utc).getTime(),
  );
  const cutoffTime = new Date(Math.min(...kickoffs) - 2 * 60 * 1000);

  // Create card + auto publish (status = 'open')
  const { data: card, error: cardErr } = await sb
    .from("gl_daily_cards")
    .insert({
      card_number: cardNumber,
      utc_date: tomorrow,
      goal_line: goalLine,
      over_odds: overOdds,
      under_odds: underOdds,
      cutoff_time_utc: cutoffTime.toISOString(),
      status: "open",
      published_at: new Date().toISOString(),
      method_note: "Line derived from real bookmaker totals, de-vigged and calibrated to ~50/50.",
    })
    .select("id")
    .single();

  if (cardErr || !card) {
    return NextResponse.json({ error: cardErr?.message ?? "Failed to create card" }, { status: 500 });
  }

  // Link matches
  const junctions = dbMatches.map((m: { id: string }, i: number) => ({
    daily_card_id: card.id as string,
    match_id: m.id,
    sort_order: i,
  }));
  await sb.from("gl_daily_card_matches").insert(junctions);

  return NextResponse.json({
    success: true,
    cardId: card.id,
    cardNumber,
    date: tomorrow,
    goalLine,
    overOdds,
    underOdds,
    derived: !!derived,
    matches: matchInputs.map((m) => `${m.homeTeam} vs ${m.awayTeam}`),
  });
}
