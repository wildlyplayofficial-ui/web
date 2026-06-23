"use client";

import { useEffect, useState } from "react";
import type { CardMatch } from "@/lib/goalline/types";
import { LocalKickoffTime } from "./local-kickoff-time";

interface MatchListProps {
  matches: CardMatch[];
  /** @deprecated Scores now always shown for live/finished matches. */
  showScores?: boolean;
}

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
    case "scheduled":
      return (
        <span className="rounded-pill bg-card-hover px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          Soon
        </span>
      );
    default:
      return null;
  }
}

function teamsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  if (al.includes(bl) || bl.includes(al)) return true;
  const af = al.split(/\s+/)[0], bf = bl.split(/\s+/)[0];
  return af.length >= 4 && (af.startsWith(bf) || bf.startsWith(af));
}

export function MatchList({ matches }: MatchListProps) {
  const [live, setLive] = useState(matches);

  // Listen for live score updates from LiveScoreSync
  useEffect(() => {
    function onLive(e: Event) {
      const liveMatches = (e as CustomEvent).detail as Array<{
        homeTeam: string; awayTeam: string;
        homeScore: number | null; awayScore: number | null;
        status: string;
      }>;
      setLive((prev) => prev.map((m) => {
        const hit = liveMatches.find(
          (l) => teamsMatch(l.homeTeam, m.home_team) && teamsMatch(l.awayTeam, m.away_team),
        );
        if (!hit) return m;
        return {
          ...m,
          home_score: hit.homeScore ?? m.home_score,
          away_score: hit.awayScore ?? m.away_score,
          valid_goals: (hit.homeScore ?? 0) + (hit.awayScore ?? 0),
          status: hit.status === "live" ? "live" : m.status,
        } as CardMatch;
      }));
    }
    window.addEventListener("wildlyplay:livescores", onLive);
    return () => window.removeEventListener("wildlyplay:livescores", onLive);
  }, []);

  // Reset when server data changes
  useEffect(() => { setLive(matches); }, [matches]);

  const sorted = [...live].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const isLive = m.status === "live";
        const isFinished = m.status === "finished";
        const hasScore = (isFinished || isLive) && m.home_score !== null && m.away_score !== null;

        return (
          <div
            key={m.id}
            className={`rounded-card border bg-card px-3 py-3 shadow-card transition-colors ${
              isLive ? "border-brand/30" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Teams */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-display text-sm font-semibold text-ink truncate">
                  {m.home_team} — {m.away_team}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  <LocalKickoffTime utc={m.kickoff_time_utc} />
                </p>
              </div>

              {/* Score + badge */}
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
