"use client";

import type { CardMatch } from "@/lib/goalline/types";

function StatusBadge({ status }: { status: CardMatch["status"] }) {
  switch (status) {
    case "live":
      return (
        <span className="inline-flex items-center gap-1 rounded-pill bg-brand-dim px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live
        </span>
      );
    case "finished":
      return (
        <span className="rounded-pill bg-card-hover px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          FT
        </span>
      );
    case "postponed":
      return (
        <span className="rounded-pill bg-warning-dim px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
          PPD
        </span>
      );
    case "abandoned":
      return (
        <span className="rounded-pill bg-loss-dim px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-loss">
          ABD
        </span>
      );
    default:
      return (
        <span className="rounded-pill bg-card-hover px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          Soon
        </span>
      );
  }
}

export function TmaMatchList({ matches }: { matches: CardMatch[] }) {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const isLive = m.status === "live";
        const isFinished = m.status === "finished";
        const hasScore =
          (isFinished || isLive) &&
          m.home_score !== null &&
          m.away_score !== null;

        return (
          <div
            key={m.id}
            className={`rounded-card border bg-card px-3 py-3 shadow-card transition-colors ${
              isLive ? "border-brand/30" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-display text-sm font-semibold text-ink truncate">
                  {m.home_team} — {m.away_team}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {new Date(m.kickoff_time_utc).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {hasScore && (
                  <span className="font-display text-lg font-bold tabular-nums text-ink">
                    {m.home_score} – {m.away_score}
                  </span>
                )}
                <StatusBadge status={m.status} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Goal dots timeline — compact summary below match list. */
export function GoalDots({ matches }: { matches: CardMatch[] }) {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);
  const hasAnyGoals = sorted.some(
    (m) => (m.home_score ?? 0) + (m.away_score ?? 0) > 0,
  );

  if (!hasAnyGoals) return null;

  return (
    <div className="flex items-center gap-4 px-1">
      {sorted.map((m) => {
        const home = m.home_score ?? 0;
        const away = m.away_score ?? 0;
        const total = home + away;
        if (total === 0 && m.status === "scheduled") return null;

        return (
          <div
            key={m.id}
            className="flex items-center gap-1"
            title={`${m.home_team} ${home}–${away} ${m.away_team}`}
          >
            <span className="text-[10px] text-muted truncate max-w-[60px]">
              {m.home_team.split(" ")[0]}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: home }, (_, i) => (
                <span key={`h${i}`} className="h-2 w-2 rounded-full bg-over" />
              ))}
              {Array.from({ length: away }, (_, i) => (
                <span key={`a${i}`} className="h-2 w-2 rounded-full bg-under" />
              ))}
              {total === 0 && (
                <span className="h-2 w-2 rounded-full bg-line" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
