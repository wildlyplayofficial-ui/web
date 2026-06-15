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

/**
 * Live match clock badge. Polls /api/live-clock/[eventId] every 60 seconds.
 * Shows nothing when the match is not live or data is unavailable.
 * When showScore is true, also renders the live score (Nick 14/6).
 */
export function LiveClock({ eventId, showScore }: { eventId: string; showScore?: boolean }) {
  const [data, setData] = useState<ClockData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch(`/api/live-clock/${eventId}`);
        if (!res.ok) return;
        const json = (await res.json()) as ClockData;
        if (!cancelled) setData(json);
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
  }, [eventId]);

  if (!data?.clock || !data.clock.running) return null;

  const { minute, period, statusDetail } = data.clock;
  const display =
    typeof minute === "number" && typeof period === "number"
      ? formatMinute(minute, period)
      : statusDetail ?? null;

  if (!display) return null;

  const score = data.scores;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-dim px-2.5 py-0.5 font-display text-xs font-semibold text-brand">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      {display}
      {showScore && score && typeof score.home === "number" && typeof score.away === "number" && (
        <span className="ml-0.5 font-bold">{score.home}-{score.away}</span>
      )}
    </span>
  );
}
