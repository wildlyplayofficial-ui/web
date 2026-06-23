"use client";

import { useEffect, useState } from "react";
import { teamFlag } from "@/lib/flags";

interface TickerMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
}

const POLL_INTERVAL = 30_000;

/** Horizontal scrolling ticker of live scores. Hidden when no matches are live. */
export function LiveTicker() {
  const [matches, setMatches] = useState<TickerMatch[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok) return;
        const json = await res.json();
        const data = (json.matches || json) as TickerMatch[];
        if (!cancelled) setMatches(data);
      } catch {
        // Silently degrade — ticker hidden.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="border-b border-line bg-card/60 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-[1100px] items-center gap-6 overflow-x-auto px-5 py-1.5"
        style={{ scrollbarWidth: "none" }}
      >
        <span className="relative mr-1 flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        {matches.map((m) => (
          <TickerItem key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ match }: { match: TickerMatch }) {
  const hf = teamFlag(match.homeTeam);
  const af = teamFlag(match.awayTeam);

  return (
    <span className="flex shrink-0 items-center gap-2 text-xs">
      <span className="font-display font-semibold">
        {hf && <span className="mr-0.5">{hf}</span>}
        {shortName(match.homeTeam)}
      </span>
      <span className="font-display font-bold text-brand tabular-nums">
        {match.homeScore ?? 0} - {match.awayScore ?? 0}
      </span>
      <span className="font-display font-semibold">
        {af && <span className="mr-0.5">{af}</span>}
        {shortName(match.awayTeam)}
      </span>
      {match.minute != null && (
        <span className="text-muted">{match.minute}&apos;</span>
      )}
    </span>
  );
}

/** Shorten long country names for the compact ticker. */
function shortName(name: string): string {
  const map: Record<string, string> = {
    "United States": "USA",
    "South Korea": "KOR",
    "Saudi Arabia": "KSA",
    "New Zealand": "NZL",
    "Costa Rica": "CRC",
    "Bosnia and Herzegovina": "BIH",
    "Ivory Coast": "CIV",
    "South Africa": "RSA",
    "North Macedonia": "MKD",
    "Republic of Ireland": "IRL",
    "Cape Verde": "CPV",
  };
  return map[name] ?? name;
}
