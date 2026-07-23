"use client";

import { useState, useCallback } from "react";
import type {
  DailyCard,
  CardMatch,
  UserPick,
  PickSide,
} from "@/lib/goalline/types";
import type { DailyLineDict } from "@/lib/goalline/strings";
import { TmaMatchList } from "./match-list";
import { CutoffUrgencyBanner, TmaCountdown, ShareButton } from "./ui";

/* ── Open Unpicked ─────────────────────────────────────────────────────── */

interface OpenUnpickedProps {
  card: DailyCard;
  matches: CardMatch[];
  S: DailyLineDict;
  onPick: (side: PickSide) => Promise<void>;
  pickLoading: boolean;
  pickError: string;
  onClearError: () => void;
}

export function CardOpenUnpicked({
  card,
  matches,
  S,
  onPick,
  pickLoading,
  pickError,
  onClearError,
}: OpenUnpickedProps) {
  const [confirmSide, setConfirmSide] = useState<PickSide | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!confirmSide) return;
    await onPick(confirmSide);
    setConfirmSide(null);
  }, [confirmSide, onPick]);

  return (
    <div className="space-y-6">
      {/* Goal Line hero */}
      <div className="relative rounded-card border border-line bg-gradient-to-b from-card to-bg p-6 shadow-card text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.GOAL_LINE_LABEL}
        </p>
        <p className="font-display text-6xl font-bold text-ink mt-2">
          {card.goal_line}
        </p>
      </div>

      {/* Pick buttons or confirmation */}
      {confirmSide ? (
        <div className="rounded-xl border border-line bg-card p-5 text-center">
          <h3 className="font-display text-lg font-bold text-ink">
            {S.CONFIRM_TITLE}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {S.CONFIRM_BODY(
              confirmSide === "over" ? S.OVER : S.UNDER,
              card.goal_line,
              confirmSide === "over" ? card.over_odds : card.under_odds,
            )}
          </p>
          <p className="mt-1 text-xs text-loss">
            Cannot be changed after locking.
          </p>
          {pickError && (
            <p className="mt-2 text-sm text-loss">{pickError}</p>
          )}
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setConfirmSide(null);
                onClearError();
              }}
              className="flex-1 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition hover:bg-card-hover"
            >
              {S.CANCEL_BTN}
            </button>
            <button
              onClick={handleConfirm}
              disabled={pickLoading}
              className="flex-1 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
            >
              {pickLoading ? "Locking..." : S.CONFIRM_BTN}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setConfirmSide("over")}
            className="min-w-0 rounded-xl border-2 border-over bg-over-dim px-3 py-5 text-center transition hover:bg-over/20 active:scale-[0.98]"
          >
            <span className="block font-display text-lg font-bold text-over">
              &#9650; {S.OVER}
            </span>
            <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">
              {card.over_odds.toFixed(2)}
            </span>
          </button>
          <button
            onClick={() => setConfirmSide("under")}
            className="min-w-0 rounded-xl border-2 border-under bg-under-dim px-3 py-5 text-center transition hover:bg-under/20 active:scale-[0.98]"
          >
            <span className="block font-display text-lg font-bold text-under">
              &#9660; {S.UNDER}
            </span>
            <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">
              {card.under_odds.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Matches */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-muted uppercase">
          Matches
        </p>
        <TmaMatchList matches={matches} />
      </div>

      {/* D8: Urgency banner when cutoff <1h */}
      <CutoffUrgencyBanner cutoffUtc={card.cutoff_time_utc} />

      {/* Countdown to cut-off */}
      <TmaCountdown targetUtc={card.cutoff_time_utc} label={S.CUTOFF_LABEL} />
    </div>
  );
}

/* ── Open Picked / Locked with pick ────────────────────────────────────── */

interface PickedProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick;
  communitySplit: { over: number; under: number } | null;
  S: DailyLineDict;
  isOpen: boolean;
  onShare: () => void;
}

export function CardPicked({
  card,
  matches,
  pick,
  communitySplit,
  S,
  isOpen,
  onShare,
}: PickedProps) {
  const sideLabel = pick.side === "over" ? S.OVER : S.UNDER;
  const sideColor = pick.side === "over" ? "text-over" : "text-under";
  const payout = Math.round(pick.stake_points * pick.odds_locked);

  const earliestKo = matches.reduce(
    (earliest, m) =>
      m.kickoff_time_utc < earliest ? m.kickoff_time_utc : earliest,
    matches[0]?.kickoff_time_utc ?? card.cutoff_time_utc,
  );

  return (
    <div className="space-y-6">
      {/* Locked pick banner */}
      <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.LOCKED_TITLE}
        </p>
        <p className={`font-display text-3xl font-bold ${sideColor} mt-1`}>
          {sideLabel} {card.goal_line}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">{S.ODDS_LOCKED}</p>
            <p className="font-display font-bold tabular-nums text-ink">
              {pick.odds_locked.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">{S.POTENTIAL_PAYOUT}</p>
            <p className="font-display font-bold tabular-nums text-ink">
              {payout} pts
            </p>
          </div>
        </div>

        {communitySplit && (
          <div className="mt-4 border-t border-line-muted pt-4">
            <p className="text-xs text-muted">{S.COMMUNITY_SPLIT}</p>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-2 rounded-full bg-over"
                style={{ width: `${communitySplit.over}%` }}
              />
              <div
                className="h-2 rounded-full bg-under"
                style={{ width: `${communitySplit.under}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>
                {S.OVER} {communitySplit.over}%
              </span>
              <span>
                {S.UNDER} {communitySplit.under}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Matches */}
      <TmaMatchList matches={matches} />

      {/* Countdown to first KO (only while open) */}
      {isOpen && <TmaCountdown targetUtc={earliestKo} label={S.FIRST_KO} />}

      <ShareButton onClick={onShare} label="Share Pick" />
    </div>
  );
}

/* ── Locked without pick ───────────────────────────────────────────────── */

interface LockedNoPickProps {
  card: DailyCard;
  matches: CardMatch[];
  S: DailyLineDict;
}

export function CardLockedNoPick({ card, matches, S }: LockedNoPickProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.CUTOFF_LABEL}
        </p>
        <p className="font-display text-5xl font-bold text-ink mt-2">
          {card.goal_line}
        </p>
        <p className="mt-2 text-sm text-muted">
          You didn&apos;t pick this round. Watch the matches below.
        </p>
      </div>
      <TmaMatchList matches={matches} />
    </div>
  );
}
