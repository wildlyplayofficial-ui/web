"use client";

import { useEffect, useState } from "react";
import type { FixtureDay } from "@/lib/standings-extra";
import type { KnockoutMatch } from "@/lib/standings";
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

/** Re-groups matches by the viewer's LOCAL calendar date instead of the
 *  UTC date the API gives us — otherwise a 19:00 UTC match shown as
 *  02:00 the next day (VN time, UTC+7) still sits under the UTC-day
 *  heading, which reads as wrong. Matches without a kickoff time can't be
 *  converted, so they keep their original (UTC) date as the group key. */
function groupByLocalDate(matches: KnockoutMatch[], vnOnly = false): FixtureDay[] {
  const groups = new Map<string, KnockoutMatch[]>();
  for (const m of matches) {
    let key = m.date;
    if (m.time) {
      const d = new Date(`${m.date}T${m.time}:00Z`);
      if (!isNaN(d.getTime())) {
        // vnOnly: gom theo giờ VN, tính không phụ thuộc múi giờ máy chủ — dùng cho
        // lần render đầu để bản Google đọc được cũng khớp tiêu đề với giờ trong thẻ.
        const t = vnOnly ? new Date(d.getTime() + 7 * 3600_000) : d;
        const y = vnOnly ? t.getUTCFullYear() : t.getFullYear();
        const mo = String((vnOnly ? t.getUTCMonth() : t.getMonth()) + 1).padStart(2, "0");
        const da = String(vnOnly ? t.getUTCDate() : t.getDate()).padStart(2, "0");
        key = `${y}-${mo}-${da}`;
      }
    }
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMatches]) => ({
      date,
      matches: dayMatches.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    }));
}

interface LeagueFixturesProps {
  days: FixtureDay[];
  label: string;
}

/** Regular-season schedule grouped by date (viewer's local time per card).
 *  Renders the server-provided (UTC) grouping first so SSR/first paint
 *  match, then re-groups by local date on mount — same
 *  useState/useEffect pattern as LocalKickoffTime, to avoid a hydration
 *  mismatch (viewer's timezone is unknown on the server). */
export function LeagueFixtures({ days, label }: LeagueFixturesProps) {
  // Lần đầu (server + hydrate): gom theo giờ VN — bản Google đọc phải khớp
  // tiêu đề với giờ trong thẻ. Sau khi chạy được JS mới gom lại theo múi giờ
  // người xem, để khách ở múi giờ khác cũng thấy đúng.
  const [groupedDays, setGroupedDays] = useState(() =>
    groupByLocalDate(days.flatMap((day) => day.matches), true),
  );

  useEffect(() => {
    setGroupedDays(groupByLocalDate(days.flatMap((day) => day.matches)));
  }, [days]);

  if (groupedDays.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-center font-display text-2xl font-bold">{label}</h2>
      <div className="space-y-8">
        {groupedDays.map((day) => (
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
