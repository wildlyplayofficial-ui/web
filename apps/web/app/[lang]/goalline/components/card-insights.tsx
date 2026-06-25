import type { CardMatch } from "@/lib/goalline/types";

interface CardInsightsProps {
  goalLine: number;
  matches: CardMatch[];
}

/**
 * Compact insights bar showing context about the card.
 * Shows avg goals/match implied, finished match scores, and remaining.
 */
export function CardInsights({ goalLine, matches }: CardInsightsProps) {
  const avgPerMatch = (goalLine / matches.length).toFixed(1);
  const started = matches.filter((m) => m.status === "finished" || m.status === "live");
  const goalsScored = matches.reduce((s, m) => s + (m.valid_goals ?? 0), 0);
  const upcoming = matches.filter((m) => m.status === "scheduled" || m.status === "postponed");

  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 font-sans text-xs text-muted">
      <span className="inline-flex items-baseline gap-1">
        <span>Avg</span>
        <span className="font-display font-bold text-sm tabular-nums text-ink">{avgPerMatch}</span>
        <span>goals/match implied</span>
      </span>
      {started.length > 0 && (
        <span className="inline-flex items-baseline gap-1">
          <span className="font-display font-bold text-sm tabular-nums text-ink">{goalsScored}</span>
          <span>goals in {started.length} match{started.length > 1 ? "es" : ""}</span>
          {upcoming.length > 0 && (
            <>
              <span>·</span>
              <span className="font-display font-bold text-sm tabular-nums text-ink">{upcoming.length}</span>
              <span>to go</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
