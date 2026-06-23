"use client";

import { useState } from "react";
import { S } from "@/lib/strings";

interface WeeklyEntry {
  user_id: string;
  display_name: string;
  discriminator: string;
  score: number;
  winning_days: number;
  current_streak: number;
  rank: number;
}

interface LeaderboardTabsProps {
  entries: WeeklyEntry[];
}

type Tab = "weekly" | "skill";

function rankMedal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}`;
}

export function LeaderboardTabs({ entries }: LeaderboardTabsProps) {
  const [tab, setTab] = useState<Tab>("weekly");

  return (
    <div className="mt-4">
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-card p-1">
        <button
          onClick={() => setTab("weekly")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "weekly"
              ? "bg-card-hover text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {S.WEEKLY_TAB}
        </button>
        <button
          onClick={() => setTab("skill")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "skill"
              ? "bg-card-hover text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {S.SKILL_TAB}
        </button>
      </div>

      {/* Weekly table */}
      {tab === "weekly" && (
        <div className="mt-4">
          {entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              No entries this week yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-left font-medium">{S.RANK}</th>
                  <th className="py-2 text-left font-medium">{S.PLAYER}</th>
                  <th className="py-2 text-right font-medium">{S.SCORE}</th>
                  <th className="py-2 text-right font-medium">{S.WINS}</th>
                  <th className="py-2 text-right font-medium">{S.STREAK}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.user_id}
                    className="border-b border-line/50 last:border-0"
                  >
                    <td className="py-3 text-left font-medium">
                      {rankMedal(e.rank)}
                    </td>
                    <td className="py-3 text-left">
                      <span className="font-medium text-ink">
                        {e.display_name}
                      </span>
                      <span className="ml-1 text-xs text-muted">
                        #{e.discriminator}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium text-ink">
                      {e.score}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted">
                      {e.winning_days}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted">
                      {e.current_streak > 0 ? `${e.current_streak}d` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Skill tab — placeholder for MVP */}
      {tab === "skill" && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted">{S.SKILL_COMING_SOON}</p>
        </div>
      )}
    </div>
  );
}
