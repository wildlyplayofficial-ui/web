"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "./admin-auth";
import { getServiceSupabase } from "./supabase-server";
import type { PickMarket, PostType, RawOutcome } from "./types";

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

// ── Post actions ───────────────────────────────────────────────────────────

const VALID_POST_TYPES: readonly PostType[] = [
  "recap", "preview", "news", "analysis", "no-play", "post-mortem", "guide",
];
const VALID_LANGS = ["en", "vi", "th", "es"] as const;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createPostAction(
  formData: FormData,
): Promise<{ error?: string; postId?: string }> {
  await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const bodyMd = (formData.get("body_md") as string)?.trim();
  const type = formData.get("type") as PostType;
  const lang = formData.get("lang") as string;

  if (!title) return { error: "Title required" };
  if (!bodyMd) return { error: "Body required" };
  if (!VALID_POST_TYPES.includes(type)) return { error: "Invalid post type" };
  if (!VALID_LANGS.includes(lang as typeof VALID_LANGS[number]))
    return { error: "Invalid language" };

  const slug = slugify(title);
  if (!slug) return { error: "Title must produce a valid slug" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data, error } = await sb
    .from("posts")
    .insert({
      title,
      body_md: bodyMd,
      type,
      lang,
      slug,
      status: "published",
      published_at: new Date().toISOString(),
      pick_ids: [],
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidateTag("posts", "max");
  return { postId: data.id };
}

export async function updatePostAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const postId = formData.get("postId") as string;
  const title = (formData.get("title") as string)?.trim();
  const bodyMd = (formData.get("body_md") as string)?.trim();
  const type = formData.get("type") as PostType;
  const lang = formData.get("lang") as string;

  if (!postId) return { error: "Post ID required" };
  if (!title) return { error: "Title required" };
  if (!bodyMd) return { error: "Body required" };
  if (!VALID_POST_TYPES.includes(type)) return { error: "Invalid post type" };
  if (!VALID_LANGS.includes(lang as typeof VALID_LANGS[number]))
    return { error: "Invalid language" };

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("posts")
    .update({
      title,
      body_md: bodyMd,
      type,
      lang,
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidateTag("posts", "max");
  return {};
}

export async function deletePostAction(
  postId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidateTag("posts", "max");
  return {};
}

// ── Draft actions (Phase 2: AI Regen) ────────────────────────────────────────

/** Publish draft: copy body_md_draft → body_md, clear draft, mark not stale.
 *  Preserves original published_at for already-published posts (SEO freshness). */
export async function publishDraftAction(
  postId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data: post } = await sb
    .from("posts")
    .select("body_md_draft, published_at")
    .eq("id", postId)
    .single();

  if (!post?.body_md_draft) return { error: "No draft to publish" };

  const { error } = await sb
    .from("posts")
    .update({
      body_md: post.body_md_draft,
      body_md_draft: null,
      stale: false,
      status: "published",
      // Only set published_at on first publish; preserve original date for re-gens
      published_at: post.published_at ?? new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidateTag("posts", "max");
  return {};
}

/** Discard draft: clear body_md_draft without affecting live content. */
export async function discardDraftAction(
  postId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("posts")
    .update({ body_md_draft: null })
    .eq("id", postId);

  if (error) return { error: error.message };
  return {};
}

/** Clear stale badge manually — admin acknowledges content is still valid. */
export async function clearStaleAction(
  postId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("posts")
    .update({ stale: false })
    .eq("id", postId);

  if (error) return { error: error.message };
  return {};
}

// ── Watching translation actions ─────────────────────────────────────────────

/** Publish watching translation draft → note_translations, clear draft. */
export async function publishWatchingTranslationAction(
  watchingId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { data: w } = await sb
    .from("watching")
    .select("note_translations, note_translations_draft")
    .eq("id", watchingId)
    .single();

  if (!w?.note_translations_draft) return { error: "No draft to publish" };

  // Merge draft into existing translations (keep any existing, overwrite with draft)
  const merged = { ...(w.note_translations ?? {}), ...w.note_translations_draft };

  const { error } = await sb
    .from("watching")
    .update({ note_translations: merged, note_translations_draft: null })
    .eq("id", watchingId);

  if (error) return { error: error.message };

  revalidateTag("watching", "max");
  return {};
}

/** Discard watching translation draft without affecting live translations. */
export async function discardWatchingTranslationAction(
  watchingId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const sb = getServiceSupabase();
  if (!sb) return { error: "Database not configured" };

  const { error } = await sb
    .from("watching")
    .update({ note_translations_draft: null })
    .eq("id", watchingId);

  if (error) return { error: error.message };
  return {};
}
