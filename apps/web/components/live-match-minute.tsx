"use client";

import { useEffect, useState } from "react";

/**
 * Client component that polls real match minute from the matches API.
 * Uses initialMinute from SSR, then polls /api/matches every 30s for
 * actual minute from live data feed (avoids kickoff-delta drift during
 * half-time and stoppage time).
 */
export function LiveMatchMinute({
  kickoffUtc,
  initialMinute,
  label,
  matchId,
}: {
  kickoffUtc: string;
  initialMinute: number | null;
  label: string;
  matchId?: string;
}) {
  const [minute, setMinute] = useState<number | null>(initialMinute);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const matches = data.matches || [];
        // Find this match by id or kickoff time
        const match = matches.find(
          (m: { id: string; kickoffUtc: string; status: string }) =>
            (matchId && m.id === matchId) || m.kickoffUtc === kickoffUtc
        );
        if (match && match.status === "live" && match.minute != null) {
          setMinute(match.minute);
        }
      } catch {
        // Silently degrade — keep last known minute
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [kickoffUtc, matchId]);

  const display = minute != null ? `${minute}'` : label;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-dim px-2 py-0.5 text-xs font-semibold text-brand">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      {display}
    </span>
  );
}
