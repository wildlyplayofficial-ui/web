import Link from "next/link";
import type { KnockoutRound, KnockoutMatch } from "@/lib/standings";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "./local-kickoff-time";

/**
 * `details` và `href` chỉ dùng ở lịch giải vô địch quốc gia (LeagueFixtures).
 * Nhánh cúp không truyền: số vòng đã nằm ở tiêu đề cột, in lại trên thẻ là thừa.
 */
interface MatchCardProps {
  match: KnockoutMatch;
  href?: string;
  details?: { roundLabel: string; provisionalLabel: string };
}

export function MatchCard({ match, href, details }: MatchCardProps) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const homeWin = hasScore && match.homeScore! > match.awayScore!;
  const awayWin = hasScore && match.awayScore! > match.homeScore!;

  const Wrapper = href ? Link : "div";
  const wrapperProps = href
    ? { href, className: "group block rounded-card border border-line bg-card p-3 text-sm shadow-card transition-colors hover:border-line-hover hover:bg-card-hover" }
    : { className: "rounded-card border border-line bg-card p-3 text-sm shadow-card" };

  return (
    <Wrapper {...(wrapperProps as { href: string; className: string })}>
      {details && match.round && (
        <p className="mb-2 font-display text-[10px] font-semibold uppercase tracking-wide text-muted">
          {details.roundLabel.replace("{n}", match.round)}
        </p>
      )}
      <div className={`flex items-center justify-between gap-2 ${homeWin ? "font-semibold text-ink" : "text-muted"}`}>
        <span className="flex items-center truncate">
          <TeamCrest name={match.homeName} />
          <span className="truncate">{match.homeName}</span>
        </span>
        {hasScore && (
          <span className="shrink-0 font-display text-base font-bold leading-5 text-ink">
            {match.homeScore}
          </span>
        )}
      </div>
      <div className={`mt-1.5 flex items-center justify-between gap-2 ${awayWin ? "font-semibold text-ink" : "text-muted"}`}>
        <span className="flex items-center truncate">
          <TeamCrest name={match.awayName} />
          <span className="truncate">{match.awayName}</span>
        </span>
        {hasScore && (
          <span className="shrink-0 font-display text-base font-bold leading-5 text-ink">
            {match.awayScore}
          </span>
        )}
      </div>
      {/* Always show kickoff date/time (even for finished matches) so cards
          in a column stay equal height — Nick's request 2/7. Shown in the
          viewer's local timezone (source date/time is UTC) — Nick 3/7. */}
      {match.date && (
        <p className="mt-2 text-[10px] text-muted">
          {match.time ? (
            <LocalKickoffTime iso={`${match.date}T${match.time}:00Z`} showDate className="text-[10px] text-muted" />
          ) : (
            match.date
          )}
        </p>
      )}
      {details && match.venue && (
        <p className="mt-1 truncate text-[10px] text-muted/70">{match.venue}</p>
      )}
      {/* Giờ lấy từ lịch gốc cả mùa, đài truyền hình còn dời — nói rõ để người
          đọc không đặt lịch nhầm rồi mất niềm tin vào cả trang. */}
      {details && match.provisional && (
        <p className="mt-1 text-[10px] text-muted/70">{details.provisionalLabel}</p>
      )}
    </Wrapper>
  );
}

interface KnockoutBracketProps {
  rounds: KnockoutRound[];
  knockoutLabel: string;
}

export function KnockoutBracket({ rounds, knockoutLabel }: KnockoutBracketProps) {
  if (rounds.length === 0) return null;

  return (
    // No top margin: renders directly under the hero (which has pb-12);
    // the group grid below adds its own mt-12.
    <section>
      <h2 className="mb-6 text-center font-display text-2xl font-bold">{knockoutLabel}</h2>

      {/* Mobile: stacked vertical sections */}
      <div className="space-y-8 md:hidden">
        {rounds.map((r) => (
          <div key={r.round}>
            <h3 className="mb-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-muted">
              {r.label}
            </h3>
            <div className="space-y-3">
              {r.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal columns per round. Columns share width equally
          (min-w-0 + flex-1) so all rounds fit without horizontal scroll. */}
      <div className="hidden md:flex md:gap-3">
        {rounds.map((r) => (
          <div key={r.round} className="min-w-0 flex-1">
            <h3 className="mb-3 text-center font-display text-xs font-semibold uppercase tracking-wide text-muted">
              {r.label}
            </h3>
            <div className="space-y-3">
              {r.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
