import Link from "next/link";
import { formatKickoff } from "@/lib/format";
import { getDict, type Lang } from "@/lib/i18n";
import type { Pick } from "@/lib/types";
import { TeamCrest } from "@/components/team-crest";
import { ConfidenceBadge } from "@/components/confidence-badge";

/**
 * "Super Sunday" hot-pick hero — the marquee prediction card shared by the
 * homepage predictions slot and the Daily Board. ESPN-style scoreboard panel on
 * the left (predicted correct score when supplied), the take + CTA on the right.
 * Brand-green framed, hero-consistent with the homepage Super Sunday article.
 */
export function HotPickCard({
  pick,
  predicted = null,
  lang,
  href,
  ctaLabel,
}: {
  pick: Pick;
  /** Predicted correct score → renders the big scoreboard digits. Omit for a market pick. */
  predicted?: { home: number; away: number } | null;
  lang: Lang;
  /** Internal route for the title + CTA (play detail for real picks, a safe route for the seed). */
  href: string;
  ctaLabel: string;
}) {
  const dict = getDict(lang);

  return (
    <article className="group grid overflow-hidden rounded-card border border-brand/40 bg-card shadow-raised md:grid-cols-2">
      {/* The take — pick is the priority, so it leads: LEFT column on desktop,
          TOP on mobile (Nick 16/8). The column divider now lives on this block. */}
      <div className="flex flex-col justify-center gap-3 border-b border-brand/20 p-6 md:border-b-0 md:border-r md:p-8">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-brand">
          ◆ {dict.home.hotPick}
        </span>
        <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl">
          <Link href={href} className="transition-colors group-hover:text-brand">
            {pick.home_team} <span className="text-muted">vs</span> {pick.away_team}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-brand/30 bg-brand-dim px-2.5 py-1 font-display text-sm font-semibold text-brand">
            {pick.selection}
          </span>
          {pick.confidence && <ConfidenceBadge level={pick.confidence} dict={dict} />}
        </div>
        <p className="text-sm leading-relaxed text-muted line-clamp-3">{pick.thesis}</p>
        <Link
          href={href}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5"
        >
          {ctaLabel} &rarr;
        </Link>
      </div>

      {/* Predicted scoreboard — now the secondary column (right on desktop, below
          on mobile). Keeps its brand-dim panel tint; divider moved to the pick. */}
      <div className="relative flex flex-col justify-center gap-4 bg-brand-dim/40 p-6 md:p-8">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-bg">
          ★ {dict.home.superSunday}
        </span>
        {predicted && (
          <span className="font-display text-[11px] font-bold uppercase tracking-widest text-muted">
            {dict.home.predictedScore}
          </span>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <TeamCrest name={pick.home_team} />
            <span className="flex-1 truncate font-display text-base font-semibold sm:text-lg">
              {pick.home_team}
            </span>
            {predicted && (
              <span className="font-display text-3xl font-bold tabular-nums text-brand">
                {predicted.home}
              </span>
            )}
          </div>
          {!predicted && (
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
              vs
            </span>
          )}
          <div className="flex items-center gap-2.5">
            <TeamCrest name={pick.away_team} />
            <span className="flex-1 truncate font-display text-base font-semibold sm:text-lg">
              {pick.away_team}
            </span>
            {predicted && (
              <span className="font-display text-3xl font-bold tabular-nums text-brand">
                {predicted.away}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">
          {pick.league}
          <span className="mx-2">·</span>
          {formatKickoff(pick.kickoff_utc, lang)}
        </p>
      </div>
    </article>
  );
}
