"use client";

import { useEffect, useState } from "react";
import { MAX_LIVE_MS } from "@/lib/match-constants";

interface Props {
  kickoffUtc: string;
  liveStatus: "live" | "ft" | null;
  minute: string | null;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Starting soon";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatKickoffTime(utc: string): string {
  const d = new Date(utc);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function MatchStatus({ kickoffUtc, liveStatus, minute }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (liveStatus) return; // no countdown needed for live/ft
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [liveStatus]);

  const kickoff = new Date(kickoffUtc).getTime();
  const timeStr = formatKickoffTime(kickoffUtc);

  if (liveStatus === "ft") {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted">FT</span>
        <span className="text-muted">{timeStr}</span>
      </div>
    );
  }

  if (liveStatus === "live") {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-brand">
          LIVE{minute ? ` ${minute}'` : ""}
        </span>
        <span className="text-muted">{timeStr}</span>
      </div>
    );
  }

  // Scheduled — but if kickoff was longer ago than a match can run, it's almost
  // certainly finished and liveStatus just wasn't set (e.g. match_live_state slug mismatch).
  const diff = kickoff - now;
  if (diff < -MAX_LIVE_MS) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted">FT</span>
        <span className="text-muted">{timeStr}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">Kicks off in {formatCountdown(diff)}</span>
      <span className="text-muted">{timeStr}</span>
    </div>
  );
}
