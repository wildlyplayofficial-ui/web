"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  status: string;
}

interface MatchEvent {
  time: string;
  type: string;
  emoji: string;
  player: string;
}

const POLL_INTERVAL = 30_000;

/**
 * Home strip: shows live commentary snippet for matches with Curator picks.
 * Only visible when there's a live match. Polls /api/matches + /api/events.
 */
export function LiveCommentaryStrip({ pickMatchSlugs }: { pickMatchSlugs: Record<string, string> }) {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [latestEvent, setLatestEvent] = useState<MatchEvent | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const matches = (data.matches ?? []) as LiveMatch[];

        // Find first live match that has a pick (by team name in pickMatchSlugs keys)
        const picked = matches.find((m) => {
          const key = `${m.homeTeam.toLowerCase()}|${m.awayTeam.toLowerCase()}`;
          return Object.keys(pickMatchSlugs).some((k) => k.toLowerCase() === key);
        });

        if (!picked) { setLiveMatch(null); return; }
        if (!cancelled) {
          setLiveMatch(picked);
          const key = Object.keys(pickMatchSlugs).find(
            (k) => k.toLowerCase() === `${picked.homeTeam.toLowerCase()}|${picked.awayTeam.toLowerCase()}`,
          );
          setMatchSlug(key ? pickMatchSlugs[key] : null);
        }

        // Fetch latest event
        const evRes = await fetch(`/api/events/${picked.id}`);
        if (evRes.ok && !cancelled) {
          const events = (await evRes.json()) as MatchEvent[];
          if (events.length > 0) {
            const sorted = [...events].sort((a, b) => parseInt(b.time) - parseInt(a.time));
            setLatestEvent(sorted[0]);
          }
        }
      } catch { /* degrade */ }
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pickMatchSlugs]);

  if (!liveMatch) return null;

  return (
    <div className="mb-6 rounded-lg border border-brand/30 bg-brand-dim/30 p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-dim px-2 py-0.5 text-[10px] font-bold text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            LIVE
          </span>
          <span className="font-display text-sm font-bold text-ink">
            {liveMatch.homeTeam} {liveMatch.homeScore ?? 0}-{liveMatch.awayScore ?? 0} {liveMatch.awayTeam}
          </span>
          {liveMatch.minute && (
            <span className="text-xs text-muted">{liveMatch.minute}&apos;</span>
          )}
        </div>
        {matchSlug && (
          <Link
            href={`/match/${matchSlug}`}
            className="text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            View live →
          </Link>
        )}
      </div>
      {latestEvent && (
        <p className="mt-2 text-xs text-muted">
          {latestEvent.emoji} {latestEvent.time}&apos; {latestEvent.player}
        </p>
      )}
    </div>
  );
}
