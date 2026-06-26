/**
 * Telegram Bot webhook handler for @WPTmaBot.
 *
 * Receives updates from Telegram, handles /play, /dailyline, /start commands,
 * and group-join events. Sends an inline keyboard button that opens the TMA
 * webapp directly inside Telegram.
 *
 * Webhook registration (run once):
 *   curl -s "https://api.telegram.org/bot${TMA_BOT_TOKEN}/setWebhook?url=https://www.wildlyplay.com/api/tma/webhook"
 */

const TMA_URL = "https://www.wildlyplay.com/tma/daily-line";

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
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Swallow — we must return 200 to Telegram regardless.
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
