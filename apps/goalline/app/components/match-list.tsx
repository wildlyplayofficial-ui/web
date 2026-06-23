import type { CardMatch } from "@/lib/types";

interface MatchListProps {
  matches: CardMatch[];
  showScores: boolean;
}

function formatKickoff(utc: string): string {
  const d = new Date(utc);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: CardMatch["status"]): string {
  switch (status) {
    case "live":
      return "LIVE";
    case "finished":
      return "FT";
    case "postponed":
      return "PPD";
    case "abandoned":
      return "ABD";
    default:
      return "";
  }
}

export function MatchList({ matches, showScores }: MatchListProps) {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-2">
      {sorted.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {m.home_team} vs {m.away_team}
            </p>
            <p className="text-xs text-muted">
              {formatKickoff(m.kickoff_time_utc)}
            </p>
          </div>

          <div className="ml-3 flex items-center gap-2">
            {showScores &&
              m.home_score !== null &&
              m.away_score !== null && (
                <span className="font-display text-lg font-bold tabular-nums text-ink">
                  {m.home_score} – {m.away_score}
                </span>
              )}

            {m.status === "live" && (
              <span className="rounded-full bg-brand-dim px-2 py-0.5 text-[10px] font-bold text-brand">
                {statusBadge(m.status)}
              </span>
            )}
            {m.status === "finished" && (
              <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-bold text-muted">
                {statusBadge(m.status)}
              </span>
            )}
            {(m.status === "postponed" || m.status === "abandoned") && (
              <span className="rounded-full bg-loss-dim px-2 py-0.5 text-[10px] font-bold text-loss">
                {statusBadge(m.status)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
