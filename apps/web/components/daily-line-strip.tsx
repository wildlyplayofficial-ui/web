import Link from "next/link";
import { getSupabase } from "@/lib/goalline/supabase";
import type { DailyCard } from "@/lib/goalline/types";
import { withLang, type Lang } from "@/lib/i18n";
/**
 * DL2: Always-on Daily Line strip on the homepage.
 * Thin, game-styled, placed below Recent Form and above Daily Board.
 * Present every day (pick-day and no-play day). Entertainment-only label (DL4).
 */

async function getTodayCard(): Promise<DailyCard | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  // Prefer open card, fallback to any active card
  const { data: openCard } = await supabase
    .from("gl_daily_cards")
    .select("id, card_number, goal_line, over_odds, under_odds, cutoff_time_utc, status, utc_date, settlement_result, void_reason")
    .in("utc_date", [today, tomorrow])
    .eq("status", "open")
    .order("utc_date", { ascending: true })
    .limit(1)
    .single();

  if (openCard) return openCard as DailyCard;

  const { data: activeCard } = await supabase
    .from("gl_daily_cards")
    .select("id, card_number, goal_line, over_odds, under_odds, cutoff_time_utc, status, utc_date, settlement_result, void_reason")
    .in("utc_date", [today, tomorrow])
    .in("status", ["locked", "live", "settled"])
    .order("utc_date", { ascending: false })
    .limit(1)
    .single();

  return (activeCard as DailyCard) ?? null;
}

export async function DailyLineStrip({ lang }: { lang: Lang }) {
  const card = await getTodayCard();

  if (!card) {
    // No-play day — still show strip with "no card today" message
    return (
      <Link
        href={withLang("/daily-line", lang)}
        className="mb-6 block rounded-lg border border-line bg-card/60 px-5 py-3 transition-colors hover:border-brand/30 hover:bg-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚡</span>
            <div>
              <span className="font-display text-sm font-bold text-ink">Daily Line</span>
              <span className="ml-2 text-xs text-muted">No card today — check back tomorrow</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand">Play →</span>
        </div>
        <p className="mt-1 text-[10px] text-muted">Entertainment only</p>
      </Link>
    );
  }

  const isOpen = card.status === "open";
  const isLive = card.status === "live";
  const isSettled = card.status === "settled";

  return (
    <Link
      href={withLang("/daily-line", lang)}
      className="mb-6 block rounded-lg border border-line bg-card/60 px-5 py-3 transition-colors hover:border-brand/30 hover:bg-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚡</span>
          <span className="font-display text-sm font-bold text-ink">Daily Line</span>
          <span className="mx-1 text-muted">·</span>
          <span className="font-display text-sm font-bold tabular-nums text-ink">
            {card.goal_line}
          </span>
          <span className="text-xs text-muted">
            ▲ {card.over_odds.toFixed(2)} / ▼ {card.under_odds.toFixed(2)}
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-dim px-2 py-0.5 text-[10px] font-bold text-brand">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              LIVE
            </span>
          )}
          {isSettled && (
            <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-bold text-muted">
              {card.settlement_result === "over" ? "OVER" : "UNDER"} WON
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <span className="hidden text-xs text-muted sm:inline">
              Card #{card.card_number}
            </span>
          )}
          <span className="text-xs font-semibold text-brand">
            {isOpen ? "Play →" : isSettled ? "Results →" : "View →"}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-muted">Entertainment only</p>
    </Link>
  );
}
