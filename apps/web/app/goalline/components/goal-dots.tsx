import type { CardMatch } from "@/lib/goalline/types";

/**
 * Visual dot timeline showing goals per match.
 * Each dot = 1 goal (green for home, blue for away).
 * Renders below the match list as a compact summary.
 */
export function GoalDots({ matches }: { matches: CardMatch[] }) {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);
  const hasAnyGoals = sorted.some(
    (m) => (m.home_score ?? 0) + (m.away_score ?? 0) > 0,
  );

  if (!hasAnyGoals) return null;

  return (
    <div className="flex items-center gap-4 px-1">
      {sorted.map((m) => {
        const home = m.home_score ?? 0;
        const away = m.away_score ?? 0;
        const total = home + away;
        if (total === 0 && m.status === "scheduled") return null;

        return (
          <div key={m.id} className="flex items-center gap-1" title={`${m.home_team} ${home}–${away} ${m.away_team}`}>
            <span className="text-[10px] text-muted truncate max-w-[60px]">
              {m.home_team.split(" ")[0]}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: home }, (_, i) => (
                <span key={`h${i}`} className="h-2 w-2 rounded-full bg-over" />
              ))}
              {Array.from({ length: away }, (_, i) => (
                <span key={`a${i}`} className="h-2 w-2 rounded-full bg-under" />
              ))}
              {total === 0 && (
                <span className="h-2 w-2 rounded-full bg-line" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
