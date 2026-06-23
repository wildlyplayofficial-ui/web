"use client";

import { useState, useEffect } from "react";

export interface MatchOption {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  competition: string;
}

interface MatchPickerProps {
  onChange: (matches: MatchOption[]) => void;
  dateFilter?: string; // YYYY-MM-DD UTC date to filter matches
}

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchPicker({ onChange, dateFilter }: MatchPickerProps) {
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setSelected(new Set());
    onChange([]);
    const url = dateFilter
      ? `/api/goalline/matches?date=${dateFilter}`
      : "/api/goalline/matches";
    fetch(url)
      .then((r) => r.json())
      .then((data: { matches?: MatchOption[]; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          const all = data.matches ?? [];
          // Filter to only matches on the selected date (UTC)
          const filtered = dateFilter
            ? all.filter((m) => m.kickoffUtc.startsWith(dateFilter))
            : all;
          setMatches(filtered);
        }
      })
      .catch(() => setError("Failed to load matches"))
      .finally(() => setLoading(false));
  }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      const selectedMatches = matches.filter((m) => next.has(m.id));
      onChange(selectedMatches);
      return next;
    });
  }

  if (loading) return <p className="py-4 text-center text-sm text-muted">Loading matches…</p>;
  if (error) return <p className="py-2 text-sm text-loss">{error}</p>;
  if (matches.length === 0) return <p className="py-2 text-sm text-muted">No upcoming matches found.</p>;

  const atMax = selected.size >= 3;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">{selected.size}/3 selected</p>
      <ul className="max-h-72 overflow-y-auto rounded-lg border border-line divide-y divide-line">
        {matches.map((m) => {
          const isChecked = selected.has(m.id);
          const isDisabled = atMax && !isChecked;
          return (
            <li key={m.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 transition ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-card-hover"} ${isChecked ? "bg-brand-dim" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => toggle(m.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {m.homeTeam} <span className="text-muted font-normal">vs</span> {m.awayTeam}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{formatKickoff(m.kickoffUtc)} · {m.competition}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
