import { badgeFor, formatKickoff, formatOdds, formatUnits } from "@/lib/format";
import { getDict, type Lang } from "@/lib/i18n";
import type { Pick } from "@/lib/types";
import { StatusBadge } from "./status-badge";

const marketLabels: Record<Pick["market"], string> = {
  ah: "Asian Handicap",
  ou: "Over/Under",
  "1x2": "1X2",
  btts: "BTTS",
  other: "Special",
};

export function PickCard({ pick, lang }: { pick: Pick; lang: Lang }) {
  const dict = getDict(lang);
  const badge = badgeFor(pick);
  const settled = pick.units_pl !== null;
  const isHalf = pick.raw_outcome === "half_win" || pick.raw_outcome === "half_loss";

  return (
    <article className="rounded-card border border-line bg-card p-6 transition-colors hover:border-[#484f58] hover:bg-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {pick.league} · {formatKickoff(pick.kickoff_utc, lang)}
        </p>
        <StatusBadge kind={badge} dict={dict} />
      </div>

      <h3 className="mt-3 font-display text-xl font-bold">
        {pick.home_team} <span className="text-muted">vs</span> {pick.away_team}
        {pick.home_score !== null && pick.away_score !== null && (
          <span className="ml-3 text-base font-semibold text-muted">
            {dict.pick.finalScore} {pick.home_score}–{pick.away_score}
          </span>
        )}
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
        {pick.thesis}
      </blockquote>

      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
