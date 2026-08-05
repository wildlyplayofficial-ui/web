"use client";

import { useEffect, useState } from "react";
import type { FixtureDay } from "@/lib/standings-extra";
import type { KnockoutMatch } from "@/lib/standings";
import type { Lang } from "@/lib/i18n";
import { locales } from "@/lib/format";
import { MatchCard } from "./knockout-bracket";

/** Formats a YYYY-MM-DD calendar date as a localized weekday + day heading.
 *  Định dạng ngay khi render, KHÔNG chờ useEffect: trước đây nhãn khởi tạo rỗng
 *  nên bản server — đúng bản Google đọc — hiện ngày thô "2026-08-22" giữa trang
 *  từ khoá chính (Jane soi live 5/8). Ngày ở đây là khoá nhóm đã tính sẵn theo
 *  đúng múi giờ, chỉ cần in ra; ghim timeZone UTC để server và trình duyệt cho
 *  cùng một chuỗi. Dùng ngôn ngữ của trang, không dùng ngôn ngữ máy người xem —
 *  trang tiếng Việt thì tiêu đề phải tiếng Việt. */
function FixtureDateHeading({ date, lang }: { date: string; lang: Lang }) {
  const [y, m, d] = date.split("-").map(Number);
  const parsed = y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
  const label =
    parsed && !isNaN(parsed.getTime())
      ? new Intl.DateTimeFormat(locales[lang], {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(parsed)
      : date;

  return (
    <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
      {label}
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
  lang: Lang;
}

/** Regular-season schedule grouped by date (viewer's local time per card).
 *  Renders the server-provided (UTC) grouping first so SSR/first paint
 *  match, then re-groups by local date on mount — same
 *  useState/useEffect pattern as LocalKickoffTime, to avoid a hydration
 *  mismatch (viewer's timezone is unknown on the server). */
export function LeagueFixtures({ days, label, lang }: LeagueFixturesProps) {
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
            <FixtureDateHeading date={day.date} lang={lang} />
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
