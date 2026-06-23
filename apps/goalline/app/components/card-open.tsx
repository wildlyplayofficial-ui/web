import type { DailyCard, CardMatch, UserPick } from "@/lib/types";
import { S } from "@/lib/strings";
import { MatchList } from "./match-list";
import { PickButtons } from "./pick-buttons";
import { Countdown } from "./countdown";

interface CardOpenUnpickedProps {
  card: DailyCard;
  matches: CardMatch[];
}

/** Open card, user has NOT picked yet — show pick buttons + countdown. */
export function CardOpenUnpicked({ card, matches }: CardOpenUnpickedProps) {
  return (
    <div className="space-y-6">
      {/* Goal Line */}
      <div className="text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.GOAL_LINE_LABEL}
        </p>
        <p className="font-display text-5xl font-bold text-ink">
          {card.goal_line}
        </p>
      </div>

      {/* Matches */}
      <MatchList matches={matches} showScores={false} />

      {/* Pick buttons */}
      <PickButtons
        cardId={card.id}
        goalLine={card.goal_line}
        overOdds={card.over_odds}
        underOdds={card.under_odds}
        disabled={false}
      />

      {/* Countdown to cut-off */}
      <Countdown targetUtc={card.cutoff_time_utc} label={S.CUTOFF_LABEL} />

      {/* Method note */}
      {card.method_note && (
        <p className="text-center text-xs text-muted">{card.method_note}</p>
      )}
    </div>
  );
}

interface CardOpenPickedProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick;
  communitySplit: { over: number; under: number } | null;
}

/** Open card, user HAS picked — show locked pick, payout, community split. */
export function CardOpenPicked({
  card,
  matches,
  pick,
  communitySplit,
}: CardOpenPickedProps) {
  const payout = Math.round(pick.stake_points * pick.odds_locked);
  const sideLabel = pick.side === "over" ? S.OVER : S.UNDER;
  const sideColor =
    pick.side === "over" ? "text-over" : "text-under";

  // Find earliest kickoff for "first KO" countdown
  const earliestKo = matches.reduce(
    (earliest, m) =>
      m.kickoff_time_utc < earliest ? m.kickoff_time_utc : earliest,
    matches[0]?.kickoff_time_utc ?? card.cutoff_time_utc,
  );

  return (
    <div className="space-y-6">
      {/* Locked pick banner */}
      <div className="rounded-xl border border-line bg-card p-5 text-center">
        <p className="text-xs font-medium tracking-wider text-muted uppercase">
          {S.LOCKED_TITLE}
        </p>
        <p className={`font-display text-3xl font-bold ${sideColor} mt-1`}>
          {sideLabel} {card.goal_line}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted">{S.ODDS_LOCKED}</p>
            <p className="font-bold text-ink">{pick.odds_locked.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted">{S.POTENTIAL_PAYOUT}</p>
            <p className="font-bold text-ink">{payout} pts</p>
          </div>
        </div>

        {/* Community split — revealed after pick per §10 */}
        {communitySplit && (
          <div className="mt-4 border-t border-line pt-4">
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
      <MatchList matches={matches} showScores={false} />

      {/* Countdown to first KO */}
      <Countdown targetUtc={earliestKo} label={S.FIRST_KO} />
    </div>
  );
}
