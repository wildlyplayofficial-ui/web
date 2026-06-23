"use client";

import { useEffect, type ReactNode } from "react";

interface LiveScoreSyncProps {
  matches: Array<{ home_team: string; away_team: string }>;
  children: ReactNode;
}

interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

const POLL_INTERVAL = 15_000;

function teamsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  if (al.includes(bl) || bl.includes(al)) return true;
  const af = al.split(/\s+/)[0], bf = bl.split(/\s+/)[0];
  return af.length >= 4 && (af.startsWith(bf) || bf.startsWith(af));
}

/**
 * Polls live API and patches score elements in the DOM for live matches.
 * Uses data attributes to find and update score displays.
 * Children render normally from server — this just patches live scores on top.
 */
export function LiveScoreSync({ matches, children }: LiveScoreSyncProps) {
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const liveMatches = (data.matches ?? []) as LiveMatch[];
        if (liveMatches.length === 0) return;

        // Dispatch custom event with live scores — child components can listen
        window.dispatchEvent(new CustomEvent("wildlyplay:livescores", {
          detail: liveMatches,
        }));
      } catch { /* degrade silently */ }
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(timer); };
  }, [matches]);

  return <>{children}</>;
}
