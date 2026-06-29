import type { DailyCard, CardMatch, UserPick } from "@/lib/goalline/types";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";
import { GoalDots } from "./goal-dots";
import { MatchList } from "./match-list";
import { LiveGoalTracker } from "./live-goal-tracker";

interface CardLiveProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
  lang?: Lang;
}

/** Live progress — goal line, current total, match scores, narrative. */
export function CardLive({ card, matches, pick, lang = "en" }: CardLiveProps) {
  const S = getDailyLineDict(lang);
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
      <div className="rounded-card border border-brand/30 bg-brand-dim p-4 shadow-card text-center">
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
      <div className="rounded-card border border-line bg-card px-4 py-3 shadow-card text-center text-sm">
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
      <GoalDots matches={matches} />
    </div>
  );
}

interface CardSettledProps {
  card: DailyCard;
  matches: CardMatch[];
  pick: UserPick | null;
  lang?: Lang;
}

/** Settlement result — final scores, total vs line, user outcome. */
export function CardSettled({ card, matches, pick, lang = "en" }: CardSettledProps) {
  const S = getDailyLineDict(lang);
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
          <span className="font-display font-bold text-brand">{winningSide}</span>
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
              {S.POINTS_EARNED}: <span className="font-display font-bold tabular-nums text-ink">+{pick.points_added}</span>
            </p>
          )}
        </div>
      )}

      {/* Match scores */}
      <MatchList matches={matches} showScores={true} />
      <GoalDots matches={matches} />

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3">
        <a
          href="/daily-line/leaderboard"
          className="inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-bg transition-colors hover:bg-brand-hover active:bg-brand-pressed"
          style={{ minHeight: 44 }}
        >
          {S.VIEW_LEADERBOARD}
        </a>
        <ShareToTelegram cardNumber={card.card_number} lang={lang} />
      </div>
    </div>
  );
}

interface CardVoidedProps {
  card: DailyCard;
  lang?: Lang;
}

/** Share to Telegram — deep link to bot game in a group. */
function ShareToTelegram({ cardNumber, lang = "en" }: { cardNumber: number; lang?: Lang }) {
  const S = getDailyLineDict(lang);
  const text = S.SHARE_TG_CAPTION(cardNumber);
  const botUrl = "https://t.me/WPTmaBot?game=dailyline";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-[#2AABEE]/10 px-5 py-2.5 text-sm font-medium text-[#2AABEE] transition-colors hover:bg-[#2AABEE]/20"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
      {S.SHARE_TG_CTA}
    </a>
  );
}

/** Voided card — refund note. */
export function CardVoided({ card, lang = "en" }: CardVoidedProps) {
  const S = getDailyLineDict(lang);
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
