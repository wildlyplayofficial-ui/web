import Link from "next/link";
import { teamFlag } from "@/lib/flags";
import { badgeFor, formatKickoff, formatOdds, formatUnits, marketLabels } from "@/lib/format";
import { getDict, withLang, type Lang } from "@/lib/i18n";
import type { Pick, VoteCounts } from "@/lib/types";
import { CrowdPoll } from "./crowd-poll";
import { LiveClock } from "./live-clock";
import { StatusBadge } from "./status-badge";
import { TeamLogo } from "./team-logo";

export function PickCard({
  pick,
  lang,
  votes,
  thesisText,
}: {
  pick: Pick;
  lang: Lang;
  /** When provided and the pick is still open, the crowd poll renders (decision #5). */
  votes?: VoteCounts;
  /** Thesis in the visitor's language (pick_content); falls back to the EN thesis. */
  thesisText?: string;
}) {
  const dict = getDict(lang);
  const badge = badgeFor(pick);
  const settled = pick.units_pl !== null;
  const isHalf = pick.raw_outcome === "half_win" || pick.raw_outcome === "half_loss";
  const homeFlag = teamFlag(pick.home_team);
  const awayFlag = teamFlag(pick.away_team);

  return (
    <article className="rounded-card border border-line bg-card p-6 transition-colors hover:border-line-hover hover:bg-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {pick.league} · {formatKickoff(pick.kickoff_utc, lang)}
        </p>
        <div className="flex items-center gap-2">
          {badge === "live" && pick.fixture_id > 0 && (
            <LiveClock eventId={String(pick.fixture_id)} showScore />
          )}
          <StatusBadge kind={badge} dict={dict} />
        </div>
      </div>

      <h3 className="mt-3 font-display text-xl font-bold">
        {/* Every pick links to its detail page — full transparency (decisions #1, #3). */}
        <Link
          href={withLang(`/play/${pick.id}`, lang)}
          className="transition-colors hover:text-brand"
        >
          {pick.home_id != null && (
            <span className="mr-1.5 inline-flex items-center">
              <TeamLogo participantId={pick.home_id} team={pick.home_team} />
            </span>
          )}
          {homeFlag && <span className="mr-1.5">{homeFlag}</span>}
          {pick.home_team} <span className="text-muted">vs</span>{" "}
          {pick.away_id != null && (
            <span className="mr-1.5 inline-flex items-center">
              <TeamLogo participantId={pick.away_id} team={pick.away_team} />
            </span>
          )}
          {awayFlag && <span className="mr-1.5">{awayFlag}</span>}
          {pick.away_team}
          {pick.home_score !== null && pick.away_score !== null && (
            <span className="ml-3 text-base font-semibold text-muted">
              {dict.pick.finalScore} {pick.home_score}–{pick.away_score}
            </span>
          )}
        </Link>
      </h3>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="rounded-md border border-brand/30 bg-brand-dim px-2.5 py-1 font-display font-semibold text-brand">
          {pick.selection}
        </span>
        <span className="text-muted">
          {marketLabels[pick.market]} · {dict.pick.odds}{" "}
          <strong className="text-ink">{formatOdds(pick.odds_publish)}</strong> · {dict.pick.stake}{" "}
          <strong className="text-ink">{pick.stake_units}u</strong>
        </span>
        {settled && pick.units_pl !== null && (
          <span
            className={`font-display font-semibold ${pick.units_pl > 0 ? "text-brand" : pick.units_pl < 0 ? "text-loss" : "text-muted"}`}
          >
            {formatUnits(pick.units_pl)}
            {isHalf && (
              <span className="ml-1.5 font-sans text-xs font-normal text-muted">
                ({pick.raw_outcome === "half_win" ? dict.pick.halfWin : dict.pick.halfLoss})
              </span>
            )}
          </span>
        )}
      </div>

      <blockquote className="mt-4 border-l-2 border-indigo-soft/60 pl-4 text-[0.95rem] leading-relaxed text-ink/90">
        <span className="font-display font-semibold text-indigo-soft">{dict.pick.curator}: </span>
        {thesisText ?? pick.thesis}
      </blockquote>

      {votes && pick.status === "published" && (
        <CrowdPoll pickId={pick.id} lang={lang} initial={votes} />
      )}

      {/* Explicit detail link — the title link alone wasn't discoverable (Nick, 12/6). */}
      <Link
        href={withLang(`/play/${pick.id}`, lang)}
        className="mt-4 inline-block font-display text-sm font-semibold text-brand transition-colors hover:text-ink"
      >
        {dict.pick.viewPlay} →
      </Link>

      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
