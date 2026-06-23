"use client";

import { useEffect, useState } from "react";
import { teamFlag } from "@/lib/flags";

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  status: string;
  kickoffUtc: string;
}

const POLL_INTERVAL = 30_000;

/**
 * Client component for live match cards. Polls /api/matches?live=1
 * every 30s to update minute + score in real-time (like the ticker).
 */
export function LiveMatchCard({
  matchId,
  initialMinute,
  initialHomeScore,
  initialAwayScore,
  homeTeam,
  awayTeam,
  liveLabel,
}: {
  matchId: string;
  initialMinute: number | null;
  initialHomeScore: number | null;
  initialAwayScore: number | null;
  homeTeam: string;
  awayTeam: string;
  liveLabel: string;
}) {
  const [minute, setMinute] = useState(initialMinute);
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const matches = (json.matches || json) as LiveMatch[];
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          if (match.minute != null) setMinute(match.minute);
          if (match.homeScore != null) setHomeScore(match.homeScore);
          if (match.awayScore != null) setAwayScore(match.awayScore);
        }
      } catch {
        // Keep last known values
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matchId]);

  const homeFlag = teamFlag(homeTeam);
  const awayFlag = teamFlag(awayTeam);
  const display = minute != null ? `${minute}'` : liveLabel;

  return (
    <>
      {/* Status: live badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-dim px-2 py-0.5 text-xs font-semibold text-brand">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          {display}
        </span>
      </div>
      {/* Teams + live score */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-sm font-semibold">
              {homeFlag && <span className="mr-1.5">{homeFlag}</span>}
              {homeTeam}
            </span>
            <span className="font-display text-sm font-bold tabular-nums">{homeScore ?? 0}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-sm font-semibold">
              {awayFlag && <span className="mr-1.5">{awayFlag}</span>}
              {awayTeam}
            </span>
            <span className="font-display text-sm font-bold tabular-nums">{awayScore ?? 0}</span>
          </div>
        </div>
      </div>
    </>
  );
}
