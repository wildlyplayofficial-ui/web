import Link from "next/link";
import { teamFlag } from "@/lib/flags";
import { buildMatchSlug } from "@/lib/data";
import { getTodaysMatches, type Match } from "@/lib/matches";
import { getDict, type Lang, withLang } from "@/lib/i18n";
import { MatchCountdown } from "./match-countdown";
import { LocalKickoffTime } from "./local-kickoff-time";
import { LiveMatchCard } from "./live-match-card";

/** Server component — today's matches on the homepage. */
export async function MatchesWidget({ lang }: { lang: Lang }) {
  const matches = await getTodaysMatches();
  const dict = getDict(lang);

  if (matches.length === 0) {
    return (
      <section className="pb-8">
        <h2 className="mb-4 font-display text-xl font-bold">{dict.matches.title}</h2>
        <div className="rounded-card border border-line bg-card px-6 py-10 text-center">
          <p className="text-muted">{dict.matches.empty}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-8">
      <h2 className="mb-4 font-display text-xl font-bold">{dict.matches.title}</h2>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const matchHref = withLang(`/match/${buildMatchSlug(m.homeTeam, m.awayTeam, m.kickoffUtc)}`, lang);
          return (
            <Link key={m.id} href={matchHref} className="block h-full">
              <MatchCard match={m} lang={lang} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MatchCard({ match, lang }: { match: Match; lang: Lang }) {
  const homeFlag = teamFlag(match.homeTeam);
  const awayFlag = teamFlag(match.awayTeam);
  const dict = getDict(lang);

  // Live matches use client component that polls for minute + score updates
  if (match.status === "live") {
    return (
      <div className="h-full rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover">
        <LiveMatchCard
          matchId={match.id}
          initialMinute={match.minute}
          initialHomeScore={match.homeScore}
          initialAwayScore={match.awayScore}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          liveLabel={dict.matches.live}
        />
      </div>
    );
  }

  return (
    <div className="h-full rounded-card border border-line bg-card p-4 transition-colors hover:border-line-hover hover:bg-card-hover">
      {/* Status row */}
      <div className="mb-3 flex items-center justify-between">
        {match.status === "upcoming" && <MatchCountdown kickoffUtc={match.kickoffUtc} prefix={dict.matches.kicksOff} />}
        {match.status === "finished" && (
          <span className="text-xs font-semibold text-muted">{dict.matches.finished}</span>
        )}
        <LocalKickoffTime iso={match.kickoffUtc} />
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <TeamRow name={match.homeTeam} flag={homeFlag} score={match.homeScore} showScore={match.status !== "upcoming"} />
          <TeamRow name={match.awayTeam} flag={awayFlag} score={match.awayScore} showScore={match.status !== "upcoming"} />
        </div>
      </div>
    </div>
  );
}

function TeamRow({ name, flag, score, showScore }: { name: string; flag: string; score: number | null; showScore: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-display text-sm font-semibold">
        {flag && <span className="mr-1.5">{flag}</span>}
        {name}
      </span>
      {showScore && (
        <span className="font-display text-sm font-bold tabular-nums">
          {score ?? 0}
        </span>
      )}
    </div>
  );
}

