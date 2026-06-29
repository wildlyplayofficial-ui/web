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
const PLAY_URL_BUTTON = { text: "🎯 Play Daily Line", url: TMA_URL };

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
  // --- Game callback (user taps "Play" on game card) ---
  if (update.callback_query?.game_short_name) {
    await tgApi("answerCallbackQuery", {
      callback_query_id: update.callback_query.id,
      url: TMA_URL,
    });
    return;
  }

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

    // /leaderboard command (groups only)
    if (/^\/leaderboard(@\w+)?$/i.test(text) && isGroup) {
      await handleLeaderboard(chatId);
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
// Supabase helper
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Inline query — Daily Line card + Leaderboard
// ---------------------------------------------------------------------------

async function handleInlineQuery(query: { id: string; query: string }): Promise<void> {
  const results: Record<string, unknown>[] = [
    {
      type: "game",
      id: "daily-line",
      game_short_name: "dailyline",
    },
  ];

  // Leaderboard as article (Games API only supports 1 game result)
  const leaderboardText = await buildLeaderboardText();
  results.push({
    type: "article",
    id: "leaderboard",
    title: "🏆 Weekly Leaderboard",
    description: "Top players this week",
    thumbnail_url: `${SITE_URL}/icons/icon-192x192.png`,
    input_message_content: {
      message_text: leaderboardText,
      parse_mode: "HTML",
    },
    reply_markup: {
      inline_keyboard: [[PLAY_URL_BUTTON]],
    },
  });

  await tgApi("answerInlineQuery", {
    inline_query_id: query.id,
    results,
    cache_time: 10,
    is_personal: false,
  });
}

async function buildLeaderboardText(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return "🏆 <b>Weekly Leaderboard</b>\n\nComing soon! Play Daily Line to compete.";

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("gl_weekly_leaderboard")
    .select("score, winning_days, rank, gl_users!inner(display_name)")
    .eq("week_start_utc", weekStartStr)
    .order("rank", { ascending: true })
    .limit(20);

  if (!entries?.length) {
    return "🏆 <b>Weekly Leaderboard</b>\n\nNo scores yet this week. Be the first — play Daily Line!";
  }

  const medals = ["🥇", "🥈", "🥉"];
  let text = "🏆 <b>Weekly Leaderboard</b>\n\n";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as { score: number; gl_users: { display_name: string } | { display_name: string }[] };
    const user = Array.isArray(e.gl_users) ? e.gl_users[0] : e.gl_users;
    const prefix = i < 3 ? medals[i] : `${i + 1}.`;
    const score = Math.round(e.score * 100) / 100;
    text += `${prefix} ${user.display_name} — <b>${score}</b> pts\n`;
  }

  return text;
}

// ---------------------------------------------------------------------------
// /leaderboard — fallback for groups where bot is a member
// ---------------------------------------------------------------------------

async function handleLeaderboard(chatId: number): Promise<void> {
  const text = await buildLeaderboardText();
  await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[PLAY_URL_BUTTON]] },
  });
}
