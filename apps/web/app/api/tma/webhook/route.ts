/**
 * Telegram Bot webhook handler for @WPTmaBot.
 *
 * Receives updates from Telegram, handles /play, /dailyline, /start commands,
 * inline queries, and group-join events. Sends an inline keyboard button that
 * opens the TMA webapp directly inside Telegram.
 *
 * Webhook registration (run once):
 *   curl -s "https://api.telegram.org/bot${TMA_BOT_TOKEN}/setWebhook?url=https://www.wildlyplay.com/api/tma/webhook"
 */

import { createClient } from "@supabase/supabase-js";

const TMA_URL = "https://www.wildlyplay.com/tma/daily-line";
const SITE_URL = "https://www.wildlyplay.com";

const PLAY_BUTTON = {
  inline_keyboard: [
    [{ text: "🎯 Play Daily Line", web_app: { url: TMA_URL } }],
  ],
};

// ---------------------------------------------------------------------------
// Telegram Bot API helper
// ---------------------------------------------------------------------------

async function tgApi(method: string, body: Record<string, unknown>): Promise<void> {
  const token = process.env.TMA_BOT_TOKEN;
  if (!token) { console.warn(`tgApi: TMA_BOT_TOKEN missing, skipping ${method}`); return; }

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`tgApi ${method} failed:`, text);
    }
  } catch (err) {
    console.error(`tgApi ${method} error:`, err);
  }
}

async function sendPlayMessage(chatId: number, text: string): Promise<void> {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: PLAY_BUTTON,
  });
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type TgUpdate = Record<string, any>;

export async function POST(request: Request): Promise<Response> {
  let update: TgUpdate;
  try {
    update = await request.json();
  } catch {
    return Response.json({ ok: true });
  }

  try {
    await handleUpdate(update);
  } catch {
    // Never fail — Telegram retries on non-200.
  }

  return Response.json({ ok: true });
}

async function handleUpdate(update: TgUpdate): Promise<void> {
  // --- Inline queries ---
  if (update.inline_query) {
    await handleInlineQuery(update.inline_query);
    return;
  }

  // --- Command messages ---
  const message = update.message;
  if (message?.text) {
    const text: string = message.text;
    const chatId: number = message.chat.id;
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";

    // /play or /dailyline command
    if (/^\/(play|dailyline)(@\w+)?$/i.test(text)) {
      const caption = isGroup
        ? "⚽ Think you know football? Tap below to play Daily Line!"
        : "⚽ Welcome to WildlyPlay! Tap below to play Daily Line.";
      await sendPlayMessage(chatId, caption);
      return;
    }

    // /start command (DM only, typically)
    if (/^\/start(@\w+)?$/i.test(text)) {
      await sendPlayMessage(
        chatId,
        "👋 Welcome to WildlyPlay!\n\nDaily Line — predict match outcomes and compete on the leaderboard. Tap the button below to start.",
      );
      return;
    }
  }

  // --- Bot added to a group ---
  const newMembers = message?.new_chat_members as Array<{ id: number; is_bot?: boolean }> | undefined;
  if (newMembers) {
    const botToken = process.env.TMA_BOT_TOKEN;
    // Extract bot id from token (format: BOT_ID:hash)
    const botId = botToken ? Number(botToken.split(":")[0]) : null;
    const botWasAdded = newMembers.some((m) => m.id === botId);

    if (botWasAdded && message?.chat?.id) {
      await sendPlayMessage(
        message.chat.id,
        "👋 Hey! I'm the WildlyPlay bot.\n\nType /play anytime to open Daily Line — predict matches and climb the leaderboard!",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Inline query handler
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface PickRow {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff_utc: string;
  market: string;
  selection: string;
  line: number | null;
  odds_publish: number;
  stake_units: number;
  status: string;
  confidence: string | null;
  thesis: string | null;
  units_pl: number | null;
}

function pickToArticle(pick: PickRow): Record<string, unknown> {
  const date = pick.kickoff_utc.slice(0, 10);
  const time = pick.kickoff_utc.slice(11, 16);
  const homeSl = slugify(pick.home_team);
  const awaySl = slugify(pick.away_team);
  let selSl = slugify(pick.selection);
  if (selSl === homeSl) selSl = "home";
  else if (selSl === awaySl) selSl = "away";
  const slug = `${homeSl}-vs-${awaySl}-${selSl}-${date}`;
  const url = `${SITE_URL}/play/${slug}`;

  const statusEmoji: Record<string, string> = {
    published: "📌", won: "✅", lost: "❌", push: "↩️", void: "⛔",
  };
  const emoji = statusEmoji[pick.status] ?? "📌";
  const lineStr = pick.line != null ? ` ${pick.line}` : "";
  const title = `${emoji} ${pick.home_team} vs ${pick.away_team}`;
  const desc = `${pick.market.toUpperCase()}${lineStr} → ${pick.selection} @ ${pick.odds_publish}\n${pick.league} · ${date} ${time} UTC`;

  let msg = `${emoji} <b>${pick.home_team} vs ${pick.away_team}</b>\n`;
  msg += `${pick.league} · ${date} ${time} UTC\n\n`;
  msg += `Market: ${pick.market.toUpperCase()}${lineStr}\n`;
  msg += `Selection: <b>${pick.selection}</b> @ ${pick.odds_publish}\n`;
  msg += `Stake: ${pick.stake_units}u · Confidence: ${pick.confidence ?? "—"}\n`;
  if (pick.thesis) msg += `\n💡 ${pick.thesis}\n`;
  if (pick.status !== "published") {
    const pl = pick.units_pl != null ? (pick.units_pl > 0 ? `+${pick.units_pl}` : `${pick.units_pl}`) : "";
    msg += `\nResult: ${pick.status.toUpperCase()} ${pl}u`;
  }
  msg += `\n\n🔗 ${url}`;

  return {
    type: "article",
    id: pick.id.slice(0, 32),
    title,
    description: desc,
    input_message_content: { message_text: msg, parse_mode: "HTML" },
    reply_markup: {
      inline_keyboard: [[
        { text: "View on WildlyPlay", url },
        { text: "🎯 Play Daily Line", url: TMA_URL },
      ]],
    },
  };
}

async function handleInlineQuery(query: { id: string; query: string }): Promise<void> {
  const q = (query.query ?? "").trim().toLowerCase();
  const supabase = getSupabase();

  const results: Record<string, unknown>[] = [];

  // Always show Daily Line as first result
  results.push({
    type: "article",
    id: "daily-line",
    title: "🎯 Play Daily Line",
    description: "Predict match outcomes and compete on the leaderboard!",
    thumbnail_url: `${SITE_URL}/icons/icon-192x192.png`,
    input_message_content: {
      message_text: "⚽ <b>Daily Line — WildlyPlay</b>\n\nPredict match outcomes and compete on the leaderboard!\n\n🎯 Tap below to play →",
      parse_mode: "HTML",
    },
    reply_markup: {
      inline_keyboard: [[{ text: "🎯 Play Daily Line", url: TMA_URL }]],
    },
  });

  if (supabase) {
    // Fetch recent picks (published + settled)
    const { data: picks } = await supabase
      .from("picks")
      .select("id, home_team, away_team, league, kickoff_utc, market, selection, line, odds_publish, stake_units, status, confidence, thesis, units_pl")
      .neq("status", "draft")
      .order("published_at", { ascending: false })
      .limit(20);

    if (picks) {
      const filtered = q
        ? picks.filter((p: PickRow) =>
            p.home_team.toLowerCase().includes(q) ||
            p.away_team.toLowerCase().includes(q) ||
            p.league.toLowerCase().includes(q) ||
            p.selection.toLowerCase().includes(q))
        : picks;

      for (const pick of filtered.slice(0, 10)) {
        results.push(pickToArticle(pick));
      }
    }
  }

  await tgApi("answerInlineQuery", {
    inline_query_id: query.id,
    results,
    cache_time: 60,
    is_personal: false,
  });
}
