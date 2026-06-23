"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "./admin-auth";
import { getServiceSupabase } from "./supabase-server";
import type { PickMarket, RawOutcome } from "./types";

const VALID_MARKETS: readonly PickMarket[] = ["ah", "ou", "1x2", "btts", "other"];
const VALID_OUTCOMES: readonly RawOutcome[] = [
  "win",
  "half_win",
  "push",
  "half_loss",
  "loss",
];

/** Map raw_outcome to the display status stored in picks.status. */
function outcomeToStatus(
  outcome: RawOutcome,
): "won" | "lost" | "push" | "void" {
  switch (outcome) {
    case "win":
    case "half_win":
      return "won";
    case "loss":
    case "half_loss":
      return "lost";
    case "push":
      return "push";
    case "void":
      return "void";
  }
}

/** Calculate units P/L from outcome, decimal odds, and stake. */
function calcUnitsPl(
  outcome: RawOutcome,
  odds: number,
  stake: number,
): number {
  switch (outcome) {
    case "win":
      return (odds - 1) * stake;
    case "loss":
      return -stake;
    case "push":
    case "void":
      return 0;
    case "half_win":
      return ((odds - 1) * stake) / 2;
    case "half_loss":
      return -stake / 2;
  }
}

// ── Pick actions ────────────────────────────────────────────────────────────

export async function createPickAction(
  formData: FormData,
): Promise<{ error?: string; pickId?: string }> {
  await requireAdmin();

  const homeTeam = (formData.get("homeTeam") as string)?.trim();
  const awayTeam = (formData.get("awayTeam") as string)?.trim();
  const league = (formData.get("league") as string)?.trim();
  const kickoffUtc = formData.get("kickoffUtc") as string;
  const market = formData.get("market") as PickMarket;
  const selection = (formData.get("selection") as string)?.trim();
  const lineRaw = formData.get("line") as string;
  const oddsRaw = formData.get("odds") as string;
  const stakeRaw = formData.get("stake") as string;
  const thesis = (formData.get("thesis") as string)?.trim();

  if (!homeTeam || !awayTeam) return { error: "Home and away teams required" };
  if (!league) return { error: "League required" };
  if (!kickoffUtc) return { error: "Kickoff time required" };
  if (!VALID_MARKETS.includes(market)) return { error: "Invalid market" };
  if (!selection) return { error: "Selection required" };
  if (!thesis) return { error: "Thesis required" };

  const odds = Number(oddsRaw);
  if (Number.isNaN(odds) || odds < 1.01 || odds > 100)
    return { error: "Odds must be 1.01-100" };

  const stake = Number(stakeRaw || "1");
  if (Number.isNaN(stake) || stake < 0.25 || stake > 5)
    return { error: "Stake must be 0.25-5" };

  const line = lineRaw ? Number(lineRaw) : null;
  if (lineRaw && Number.isNaN(line)) return { error: "Line must be a number" };

  const kickoff = new Date(kickoffUtc);
  if (Number.isNaN(kickoff.getTime())) return { error: "Invalid kickoff date" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data, error } = await sb
    .from("picks")
    .insert({
      fixture_id: 0,
      home_team: homeTeam,
      away_team: awayTeam,
      league,
      kickoff_utc: kickoff.toISOString(),
      market,
      selection,
      line,
      odds_publish: odds,
      stake_units: stake,
      thesis,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidateTag("picks", "max");

  // Trigger worker pipeline (preview + analysis + announce TG/FB)
  const workerUrl = process.env.WORKER_WEBHOOK_URL;
  const webhookSecret = process.env.REVALIDATE_SECRET;
  if (workerUrl && data?.id) {
    fetch(`${workerUrl}/webhook/pick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify({ pickId: data.id }),
    }).catch(() => {}); // fire-and-forget
  }

  return { pickId: data.id };
}

export async function voidPickAction(
  pickId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("picks")
    .update({ status: "void", units_pl: 0 })
    .eq("id", pickId)
    .eq("status", "published");

  if (error) return { error: error.message };

  revalidateTag("picks", "max");
  return {};
}

export async function settlePickAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const pickId = formData.get("pickId") as string;
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const outcome = formData.get("outcome") as RawOutcome;

  if (!pickId) return { error: "Pick ID required" };
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore))
    return { error: "Valid scores required" };
  if (!VALID_OUTCOMES.includes(outcome))
    return { error: "Invalid outcome" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  // Fetch pick to get odds + stake for P/L calc
  const { data: pick, error: fetchErr } = await sb
    .from("picks")
    .select("odds_publish, stake_units, status")
    .eq("id", pickId)
    .single();

  if (fetchErr || !pick) return { error: fetchErr?.message ?? "Pick not found" };
  if (pick.status !== "published") return { error: "Pick is not published" };

  const unitsPl = calcUnitsPl(outcome, pick.odds_publish, pick.stake_units);
  const status = outcomeToStatus(outcome);

  const { error } = await sb
    .from("picks")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      raw_outcome: outcome,
      units_pl: unitsPl,
      status,
      settled_at: new Date().toISOString(),
    })
    .eq("id", pickId);

  if (error) return { error: error.message };

  revalidateTag("picks", "max");
  return {};
}

// ── Watching actions ────────────────────────────────────────────────────────

export async function createWatchingAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const homeTeam = (formData.get("homeTeam") as string)?.trim();
  const awayTeam = (formData.get("awayTeam") as string)?.trim();
  const league = (formData.get("league") as string)?.trim();
  const kickoffUtc = formData.get("kickoffUtc") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!homeTeam || !awayTeam) return { error: "Home and away teams required" };
  if (!league) return { error: "League required" };
  if (!kickoffUtc) return { error: "Kickoff time required" };

  const kickoff = new Date(kickoffUtc);
  if (Number.isNaN(kickoff.getTime())) return { error: "Invalid kickoff date" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data, error } = await sb.from("watching").insert({
    home_team: homeTeam,
    away_team: awayTeam,
    league,
    kickoff_utc: kickoff.toISOString(),
    note,
    status: "active",
    pick_id: null,
  }).select("id").single();

  if (error) return { error: error.message };

  revalidateTag("watching", "max");

  // Trigger worker pipeline (buzz, translate, news article, auto-post)
  const workerUrl = process.env.WORKER_WEBHOOK_URL;
  const webhookSecret = process.env.REVALIDATE_SECRET;
  if (workerUrl && data?.id) {
    fetch(`${workerUrl}/webhook/watching`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify({ watchingId: data.id }),
    }).catch(() => {}); // fire-and-forget
  }

  return {};
}

export async function unwatchAction(
  watchingId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("watching")
    .update({ status: "expired" })
    .eq("id", watchingId)
    .eq("status", "active");

  if (error) return { error: error.message };

  revalidateTag("watching", "max");
  return {};
}
