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

      {/* Share to Telegram */}
      <ShareToTelegram cardNumber={card.card_number} lang={lang} />
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

      {/* Share to Telegram */}
      <ShareToTelegram cardNumber={card.card_number} lang={lang} />
    </div>
  );
}

/** Share to Telegram — deep link to bot game in a group. */
function ShareToTelegram({ cardNumber, lang = "en" }: { cardNumber: number; lang?: Lang }) {
  const S = getDailyLineDict(lang);
  const text = S.SHARE_TG_CAPTION(cardNumber);
  const botUrl = "https://t.me/WPTmaBot?game=dailyline";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="text-center">
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-[#2AABEE]/10 px-5 py-2.5 text-sm font-medium text-[#2AABEE] transition-colors hover:bg-[#2AABEE]/20"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
        {S.SHARE_TG_CTA}
      </a>
    </div>
  );
}
