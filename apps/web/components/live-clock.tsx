"use client";

import { useEffect, useState } from "react";

interface ClockData {
  clock: {
    minute?: number;
    playedSeconds?: number;
    period?: number;
    running?: boolean;
    statusDetail?: string;
  } | null;
  status: string | null;
  scores: { home?: number; away?: number } | null;
}

/** Convert cumulative minute to standard football display.
 *  Period 1: 1'-45', then "45+X'" for extra time.
 *  Period 2: 46'-90', then "90+X'" for extra time.
 *  Halftime / other periods: show statusDetail instead. */
function formatMinute(minute: number, period: number): string {
  if (period === 1) {
    return minute > 45 ? `45+${minute - 45}'` : `${minute}'`;
  }
  if (period === 2) {
    return minute > 90 ? `90+${minute - 90}'` : `${minute}'`;
  }
  return `${minute}'`;
}

const POLL_INTERVAL = 60_000;

interface MatchApiEntry {
  homeTeam: string;
  awayTeam: string;
  status: string;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

/** Fuzzy team name match — handles Czechia/Czech Republic, Turkiye/Turkey, etc. */
function teamsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return true;
  if (al.includes(bl) || bl.includes(al)) return true;
  // Match on first word (e.g. "czechia" ~ "czech republic" both start with "czech")
  const aFirst = al.split(/\s+/)[0];
  const bFirst = bl.split(/\s+/)[0];
  return aFirst.length >= 4 && (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst));
}

/** Try /api/matches as a fallback data source (livescore-api). */
async function fetchMatchesFallback(homeTeam: string, awayTeam: string): Promise<ClockData | null> {
  try {
    const res = await fetch("/api/matches?live=1");
    if (!res.ok) return null;
    const body = (await res.json()) as { matches: MatchApiEntry[] };
    const match = body.matches.find(
      (m) =>
        m.status === "live" &&
        teamsMatch(m.homeTeam, homeTeam) &&
        teamsMatch(m.awayTeam, awayTeam),
    );
    if (!match) return null;
    return {
      clock: match.minute != null ? { minute: match.minute, period: match.minute <= 45 ? 1 : 2, running: true } : null,
      status: "live",
      scores: match.homeScore != null && match.awayScore != null ? { home: match.homeScore, away: match.awayScore } : null,
    };
  } catch {
    return null;
  }
}

/**
 * Live match clock badge. Polls /api/live-clock/[eventId] every 60 seconds.
 * Falls back to /api/matches (livescore-api) when odds-api has no data.
 * When showScore is true, also renders the live score (Nick 14/6).
 */
export function LiveClock({
  eventId,
  showScore,
  homeTeam,
  awayTeam,
}: {
  eventId: string;
  showScore?: boolean;
  homeTeam?: string;
  awayTeam?: string;
}) {
  const [data, setData] = useState<ClockData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        // Try odds-api first (if valid eventId)
        if (eventId && eventId !== "0") {
          const res = await fetch(`/api/live-clock/${eventId}`);
          if (res.ok) {
            const json = (await res.json()) as ClockData;
            if (json.clock?.running) {
              if (!cancelled) setData(json);
              return;
            }
          }
        }
        // Fallback: /api/matches (livescore-api)
        if (homeTeam && awayTeam) {
          const fallback = await fetchMatchesFallback(homeTeam, awayTeam);
          if (!cancelled && fallback) setData(fallback);
        }
      } catch {
        // Silently degrade — no clock shown.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId, homeTeam, awayTeam]);

  const clock = data?.clock;
  const running = clock?.running;
  const { minute, period, statusDetail } = clock ?? {};
  const display =
    running && typeof minute === "number" && typeof period === "number"
      ? formatMinute(minute, period)
      : running && statusDetail
        ? statusDetail
        : null;

  const score = data?.scores;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-dim px-2.5 py-0.5 font-display text-xs font-semibold text-brand">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      LIVE
      {display && (
        <>
          <span className="mx-0.5">·</span>
          {display}
        </>
      )}
      {showScore && score && typeof score.home === "number" && typeof score.away === "number" && (
        <>
          <span className="mx-0.5">·</span>
          <span className="font-bold">{score.home}-{score.away}</span>
        </>
      )}
    </span>
  );
}
