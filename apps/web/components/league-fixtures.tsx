"use client";

import { useEffect, useState } from "react";
import type { FixtureDay } from "@/lib/standings-extra";
import { MatchCard } from "./knockout-bracket";

/** Formats a YYYY-MM-DD calendar date as a localized weekday + day heading. */
function FixtureDateHeading({ date }: { date: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return;
    const local = new Date(y, m - 1, d);
    if (isNaN(local.getTime())) return;
    setLabel(
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "short",
      }).format(local),
    );
  }, [date]);

  return (
    <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
      {label || date}
    </h3>
  );
}

interface LeagueFixturesProps {
  days: FixtureDay[];
  label: string;
}

/** Regular-season schedule grouped by date (viewer's local time per card). */
export function LeagueFixtures({ days, label }: LeagueFixturesProps) {
  if (days.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-center font-display text-2xl font-bold">{label}</h2>
      <div className="space-y-8">
        {days.map((day) => (
          <div key={day.date}>
            <FixtureDateHeading date={day.date} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {day.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
