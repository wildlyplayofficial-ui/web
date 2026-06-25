"use client";

import { useEffect, useState } from "react";

interface StickyTrackerProps {
  totalGoals: number;
  goalLine: number;
  status: string;
}

/**
 * Sticky bar that appears when user scrolls past the goal line card.
 * Shows "4 / 7.5 — Under leading" at the top of the viewport.
 */
export function StickyTracker({ totalGoals: serverGoals, goalLine, status }: StickyTrackerProps) {
  const [visible, setVisible] = useState(false);
  const [liveGoals, setLiveGoals] = useState(serverGoals);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Listen for live score updates
  useEffect(() => {
    function onLive(e: Event) {
      const liveMatches = (e as CustomEvent).detail as Array<{
        homeScore: number | null; awayScore: number | null;
      }>;
      const liveTotal = liveMatches.reduce(
        (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0,
      );
      if (liveTotal > 0) setLiveGoals(liveTotal);
    }
    window.addEventListener("wildlyplay:livescores", onLive);
    return () => window.removeEventListener("wildlyplay:livescores", onLive);
  }, []);

  useEffect(() => { setLiveGoals(serverGoals); }, [serverGoals]);

  const totalGoals = Math.max(liveGoals, serverGoals);

  if (status !== "locked" && status !== "live" && status !== "settled") return null;
  if (!visible) return null;

  const overWinning = totalGoals > goalLine;
  const sideLabel = overWinning ? "Over" : "Under";
  const sideColor = overWinning ? "text-over" : "text-under";

  const statusText = status === "settled"
    ? `${sideLabel} won`
    : overWinning
      ? "Over clinched"
      : `${Math.ceil(goalLine) - totalGoals} more for Over`;

  // Tint by state: Over = green, Under = blue
  const barStyle: React.CSSProperties = overWinning
    ? { borderTopColor: "#00e676", background: "linear-gradient(0deg, rgba(0,230,118,0.15), rgba(0,230,118,0.05))" }
    : { borderTopColor: "#54a2ff", background: "linear-gradient(0deg, rgba(84,162,255,0.15), rgba(84,162,255,0.05))" };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t-2 backdrop-blur-md"
      style={{ ...barStyle, boxShadow: "0 -8px 24px rgba(0,0,0,0.4)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          {status === "live" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-dim px-2 py-0.5 text-[10px] font-bold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              LIVE
            </span>
          )}
          <span className="font-display text-xl font-bold tabular-nums text-ink">
            {totalGoals}
          </span>
          <span className="text-sm text-muted">/ {goalLine}</span>
        </div>
        <span className={`font-display text-sm font-bold ${sideColor}`}>
          {statusText}
        </span>
      </div>
    </div>
  );
}
