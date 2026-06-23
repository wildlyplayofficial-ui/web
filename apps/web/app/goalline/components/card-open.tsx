import type { DailyCard, CardMatch, UserPick } from "@/lib/goalline/types";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";
import { MatchList } from "./match-list";
import { PickButtons } from "./pick-buttons";
import { Countdown } from "./countdown";

interface CardOpenUnpickedProps {
  card: DailyCard;
  matches: CardMatch[];
  lang?: Lang;
}

/** Open card, user has NOT picked yet — show pick buttons + countdown. */
export function CardOpenUnpicked({ card, matches, lang = "en" }: CardOpenUnpickedProps) {
  const S = getDailyLineDict(lang);
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

      {/* Pick buttons */}
      <PickButtons
        cardId={card.id}
        goalLine={card.goal_line}
        overOdds={card.over_odds}
        underOdds={card.under_odds}
        disabled={false}
        lang={lang}
      />

      {/* Matches */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-muted uppercase">Matches</p>
        <MatchList matches={matches} showScores={false} />
      </div>

      {/* Countdown to cut-off */}
      <Countdown targetUtc={card.cutoff_time_utc} label={S.CUTOFF_LABEL} />
    </div>
  );
}

interface CardOpenPickedProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick;
  communitySplit: { over: number; under: number } | null;
  lang?: Lang;
}

/** Open card, user HAS picked — show locked pick, payout, community split. */
export function CardOpenPicked({
  card,
  matches,
  pick,
  communitySplit,
  lang = "en",
}: CardOpenPickedProps) {
  const S = getDailyLineDict(lang);
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
            <p className="font-display font-bold tabular-nums text-ink">{pick.odds_locked.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{S.POTENTIAL_PAYOUT}</p>
            <p className="font-display font-bold tabular-nums text-ink">{payout} pts</p>
          </div>
        </div>

        {/* Community split — revealed after pick per §10 */}
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
      <MatchList matches={matches} showScores={false} />

      {/* Countdown to first KO */}
      <Countdown targetUtc={earliestKo} label={S.FIRST_KO} />
    </div>
  );
}
