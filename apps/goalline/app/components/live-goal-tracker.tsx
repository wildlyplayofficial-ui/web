"use client";

import { S } from "@/lib/strings";

interface LiveGoalTrackerProps {
  totalGoals: number;
  goalLine: number;
  matchesFinished: number;
  matchesTotal: number;
}

/**
 * Visual goal tracker for live progress.
 * Shows total goals vs line with a progress bar and match count.
 */
export function LiveGoalTracker({
  totalGoals,
  goalLine,
  matchesFinished,
  matchesTotal,
}: LiveGoalTrackerProps) {
  // Progress bar: goals relative to line (cap at 150% for visual)
  const progress = goalLine > 0 ? Math.min(totalGoals / goalLine, 1.5) : 0;
  const barWidth = `${Math.round((progress / 1.5) * 100)}%`;
  const overLine = totalGoals > goalLine;

  return (
    <div className="mt-4 space-y-3">
      {/* Total goals display */}
      <div>
        <p className="text-sm text-muted">{S.TOTAL_GOALS}</p>
        <p className="font-display text-5xl font-bold text-ink">
          {totalGoals}
        </p>
        <p className="text-sm text-muted">
          {S.GOAL_LINE_LABEL}: {goalLine}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative mx-auto h-3 w-full max-w-xs overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overLine ? "bg-over" : "bg-under"
          }`}
          style={{ width: barWidth }}
        />
        {/* Line marker at 66.7% (1.0/1.5 of bar range) */}
        <div
          className="absolute top-0 h-full w-0.5 bg-ink/50"
          style={{ left: "66.67%" }}
        />
      </div>

      {/* Match progress */}
      <p className="text-xs text-muted">
        {S.MATCHES_PROGRESS(matchesFinished, matchesTotal)}
      </p>
    </div>
  );
}
