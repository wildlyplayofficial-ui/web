import type { DailyCard, CardMatch, UserPick } from "@/lib/types";
import { S } from "@/lib/strings";
import { MatchList } from "./match-list";
import { LiveGoalTracker } from "./live-goal-tracker";

interface CardLiveProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
}

/** Live progress — goal line, current total, match scores, narrative. */
export function CardLive({ card, matches, pick }: CardLiveProps) {
  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );
  const line = card.goal_line;
  const overWinning = totalGoals > line;
  const finished = matches.filter((m) => m.status === "finished").length;
  const winningSide = overWinning ? S.OVER : S.UNDER;

  return (
    <div className="space-y-6">
      {/* Live banner */}
      <div className="rounded-xl border border-brand bg-brand-dim p-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
          <p className="text-xs font-bold tracking-wider text-brand uppercase">
            {S.LIVE_TITLE}
          </p>
        </div>

        <LiveGoalTracker
          totalGoals={totalGoals}
          goalLine={line}
          matchesFinished={finished}
          matchesTotal={matches.length}
        />
      </div>

      {/* Narrative */}
      <div className="rounded-lg border border-line bg-card px-4 py-3 text-center text-sm">
        <p className="font-medium text-ink">
          {S.WINNING_SIDE}: <span className="text-brand">{winningSide}</span>
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
              pick.side === "over" ? "font-bold text-over" : "font-bold text-under"
            }
          >
            {pick.side === "over" ? S.OVER : S.UNDER} {card.goal_line}
          </span>
        </div>
      )}

      {/* Match scores */}
      <MatchList matches={matches} showScores={true} />
    </div>
  );
}

interface CardSettledProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
}

/** Settlement result — final scores, total vs line, user outcome. */
export function CardSettled({ card, matches, pick }: CardSettledProps) {
  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );
  const winningSide =
    card.settlement_result === "over" ? S.OVER : S.UNDER;

  return (
    <div className="space-y-6">
      {/* Result header */}
      <div className="rounded-xl border border-line bg-card p-5 text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.RESULT_TITLE}
        </p>

        <div className="mt-3">
          <p className="text-sm text-muted">{S.TOTAL_VS_LINE}</p>
          <p className="font-display text-4xl font-bold text-ink">
            {totalGoals}{" "}
            <span className="text-muted">vs</span>{" "}
            {card.goal_line}
          </p>
        </div>

        <p className="mt-3 text-sm text-muted">
          {S.WINNING_SIDE_LABEL}:{" "}
          <span className="font-bold text-brand">{winningSide}</span>
        </p>
      </div>

      {/* User outcome */}
      {pick && (
        <div
          className={`rounded-xl border p-5 text-center ${
            pick.status === "won"
              ? "border-brand bg-brand-dim"
              : "border-loss bg-loss-dim"
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
              {S.POINTS_EARNED}: <span className="font-bold text-ink">+{pick.points_added}</span>
            </p>
          )}
        </div>
      )}

      {/* Match scores */}
      <MatchList matches={matches} showScores={true} />

      {/* CTA */}
      <div className="text-center">
        <a
          href="/leaderboard"
          className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-bold text-bg transition hover:opacity-90"
        >
          {S.VIEW_LEADERBOARD}
        </a>
      </div>
    </div>
  );
}

interface CardVoidedProps {
  card: DailyCard;
}

/** Voided card — refund note. */
export function CardVoided({ card }: CardVoidedProps) {
  return (
    <div className="rounded-xl border border-line bg-card p-6 text-center">
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
