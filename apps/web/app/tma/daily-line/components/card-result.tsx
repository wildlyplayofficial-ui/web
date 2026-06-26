"use client";

import type { DailyCard, CardMatch, UserPick } from "@/lib/goalline/types";
import type { DailyLineDict } from "@/lib/goalline/strings";
import { TmaMatchList, GoalDots } from "./match-list";
import { ShareButton } from "./ui";

/* ── Live ──────────────────────────────────────────────────────────────── */

interface LiveProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
  S: DailyLineDict;
}

export function CardLive({ card, matches, pick, S }: LiveProps) {
  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );
  const line = card.goal_line;
  const overWinning = totalGoals > line;
  const finished = matches.filter((m) => m.status === "finished").length;
  const winningSide = overWinning ? S.OVER : S.UNDER;

  // Progress bar
  const progress = line > 0 ? Math.min(totalGoals / line, 1.5) : 0;
  const barWidth = `${Math.round((progress / 1.5) * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Live banner */}
      <div className="rounded-card border border-brand/30 bg-brand-dim p-4 shadow-card text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
          <p className="text-xs font-bold tracking-wider text-brand uppercase">
            {S.LIVE_TITLE}
          </p>
        </div>

        {/* Live goal tracker (matches web LiveGoalTracker) */}
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-muted">{S.TOTAL_GOALS}</p>
            <p className="font-display text-5xl font-bold text-ink">
              {totalGoals}
            </p>
            <p className="text-sm text-muted">
              {S.GOAL_LINE_LABEL}: {line}
            </p>
          </div>

          <div className="relative mx-auto h-3 w-full max-w-xs overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overWinning ? "bg-over" : "bg-under"
              }`}
              style={{ width: barWidth }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-ink/50"
              style={{ left: "66.67%" }}
            />
          </div>

          <p className="text-xs text-muted">
            {S.MATCHES_PROGRESS(finished, matches.length)}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <div className="rounded-card border border-line bg-card px-4 py-3 shadow-card text-center text-sm">
        <p className="font-medium text-ink">
          {S.WINNING_SIDE}:{" "}
          <span className="text-brand">{winningSide}</span>
        </p>
        <p className="mt-1 text-muted">
          {overWinning
            ? `${S.OVER} has clinched!`
            : totalGoals === Math.floor(line)
              ? S.UNDER_SURVIVES(Math.floor(line))
              : S.OVER_NEEDS(Math.ceil(line) - totalGoals)}
        </p>
      </div>

      {/* User's pick reminder */}
      {pick && (
        <div className="text-center text-sm text-muted">
          {S.YOUR_PICK}:{" "}
          <span
            className={
              pick.side === "over"
                ? "font-bold text-over"
                : "font-bold text-under"
            }
          >
            {pick.side === "over" ? S.OVER : S.UNDER} {card.goal_line}
          </span>
        </div>
      )}

      {/* Match scores + goal dots */}
      <TmaMatchList matches={matches} />
      <GoalDots matches={matches} />
    </div>
  );
}

/* ── Settled ───────────────────────────────────────────────────────────── */

interface SettledProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
  S: DailyLineDict;
  onShare: () => void;
}

export function CardSettled({ card, matches, pick, S, onShare }: SettledProps) {
  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );
  const winningSide =
    card.settlement_result === "over" ? S.OVER : S.UNDER;

  return (
    <div className="space-y-6">
      {/* Result header */}
      <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.RESULT_TITLE}
        </p>
        <div className="mt-3">
          <p className="text-xs text-muted">{S.TOTAL_VS_LINE}</p>
          <p className="font-display text-4xl font-bold tabular-nums text-ink mt-1">
            {totalGoals}{" "}
            <span className="text-muted">vs</span>{" "}
            {card.goal_line}
          </p>
        </div>
        <p className="mt-3 text-sm text-muted">
          {S.WINNING_SIDE_LABEL}:{" "}
          <span className="font-display font-bold text-brand">
            {winningSide}
          </span>
        </p>
      </div>

      {/* User outcome */}
      {pick && (
        <div
          className={`rounded-card border p-4 shadow-card text-center ${
            pick.status === "won"
              ? "border-brand/30 bg-brand-dim"
              : "border-loss/30 bg-loss-dim"
          }`}
        >
          <p className="text-xs font-medium tracking-wider uppercase text-muted">
            {S.YOUR_RESULT}
          </p>
          <p
            className={`font-display text-2xl font-bold mt-1 ${
              pick.status === "won" ? "text-brand" : "text-loss"
            }`}
          >
            {pick.status === "won" ? S.WON : S.LOST}
          </p>
          {pick.points_added !== null && (
            <p className="mt-2 text-sm text-muted">
              {S.POINTS_EARNED}:{" "}
              <span className="font-display font-bold tabular-nums text-ink">
                +{pick.points_added}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Match scores + goal dots */}
      <TmaMatchList matches={matches} />
      <GoalDots matches={matches} />

      <ShareButton onClick={onShare} label="Share Result" />
    </div>
  );
}

/* ── Voided ────────────────────────────────────────────────────────────── */

export function CardVoided({
  card,
  S,
}: {
  card: DailyCard;
  S: DailyLineDict;
}) {
  return (
    <div className="rounded-card border border-loss/30 bg-loss-dim p-4 shadow-card text-center">
      <p className="font-display text-xl font-bold text-ink">
        {S.VOIDED_TITLE}
      </p>
      <p className="mt-2 text-sm text-muted">{S.VOIDED_BODY}</p>
      {card.void_reason && (
        <p className="mt-3 text-xs text-muted">
          Reason: {card.void_reason}
        </p>
      )}
    </div>
  );
}
