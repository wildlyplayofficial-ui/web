"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FixtureDay } from "@/lib/standings-extra";
import type { KnockoutMatch } from "@/lib/standings";
import { withLang, type Lang } from "@/lib/i18n";
import { locales } from "@/lib/format";
import { buildMatchSlug } from "@/lib/data";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "./local-kickoff-time";

/** Formats a YYYY-MM-DD calendar date as a localized weekday + day heading.
 *  Định dạng ngay khi render, KHÔNG chờ useEffect: trước đây nhãn khởi tạo rỗng
 *  nên bản server — đúng bản Google đọc — hiện ngày thô "2026-08-22" giữa trang
 *  từ khoá chính (Jane soi live 5/8). Ngày ở đây là khoá nhóm đã tính sẵn theo
 *  đúng múi giờ, chỉ cần in ra; ghim timeZone UTC để server và trình duyệt cho
 *  cùng một chuỗi. Dùng ngôn ngữ của trang, không dùng ngôn ngữ máy người xem —
 *  trang tiếng Việt thì tiêu đề phải tiếng Việt. */
function formatDateHeading(date: string, lang: Lang): string {
  const [y, m, d] = date.split("-").map(Number);
  const parsed = y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
  if (!parsed || isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locales[lang], {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
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

/** Một trận = một hàng ngang, không phải thẻ vuông: mắt người đọc rà dọc theo
 *  cột giờ để tìm trận, kiểu VnExpress/Livescore. Lưới 5 cột chỉ bật từ sm trở
 *  lên; điện thoại bỏ cột sân và mũi tên để tên đội còn chỗ thở. */
function FixtureRow({ match, lang }: { match: KnockoutMatch; lang: Lang }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const href = match.time
    ? withLang(
        `/match/${buildMatchSlug(match.homeName, match.awayName, `${match.date}T${match.time}:00Z`)}`,
        lang,
      )
    : null;

  const row = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto_1fr_1.5rem] sm:gap-3">
      <span className="col-span-3 order-last truncate text-center text-[11px] text-muted/70 sm:col-span-1 sm:order-none sm:text-left">
        {match.venue ?? ""}
      </span>

      <span className="flex min-w-0 items-center justify-end gap-2 text-right text-sm">
        <span className="truncate">{match.homeName}</span>
        <TeamCrest name={match.homeName} />
      </span>

      <span className="shrink-0 text-center font-display text-base font-bold tabular-nums">
        {hasScore ? (
          `${match.homeScore} - ${match.awayScore}`
        ) : match.time ? (
          <LocalKickoffTime
            iso={`${match.date}T${match.time}:00Z`}
            className="font-display text-base font-bold tabular-nums"
          />
        ) : (
          "—"
        )}
      </span>

      <span className="flex min-w-0 items-center gap-2 text-sm">
        <TeamCrest name={match.awayName} />
        <span className="truncate">{match.awayName}</span>
      </span>

      <span
        aria-hidden="true"
        className="hidden text-muted transition-colors group-hover:text-brand sm:inline"
      >
        →
      </span>
    </div>
  );

  if (!href) return <div className="border-t border-line first:border-t-0">{row}</div>;

  return (
    <Link
      href={href}
      className="group block border-t border-line transition-colors first:border-t-0 hover:bg-card-hover"
    >
      {row}
    </Link>
  );
}

interface LeagueFixturesProps {
  days: FixtureDay[];
  label: string;
  lang: Lang;
  roundLabel: string;
  provisionalLabel: string;
}

/** Regular-season schedule grouped by date (viewer's local time per row).
 *  Renders the server-provided (UTC) grouping first so SSR/first paint
 *  match, then re-groups by local date on mount — same
 *  useState/useEffect pattern as LocalKickoffTime, to avoid a hydration
 *  mismatch (viewer's timezone is unknown on the server). */
export function LeagueFixtures({
  days,
  label,
  lang,
  roundLabel,
  provisionalLabel,
}: LeagueFixturesProps) {
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
      {label && <h2 className="mb-6 text-center font-display text-2xl font-bold">{label}</h2>}
      <div className="space-y-4">
        {groupedDays.map((day) => {
          // Số vòng để ở đầu nhóm ngày chứ không lặp trên từng hàng. Gần như
          // ngày nào cũng thuộc một vòng, nhưng vòng đá bù thì không — nên gom
          // các vòng có mặt rồi in hết, đỡ phải nói dối một con số.
          const rounds = [...new Set(day.matches.map((m) => m.round).filter(Boolean))];
          const anyProvisional = day.matches.some((m) => m.provisional);

          return (
            <div key={day.date} className="overflow-hidden rounded-card border border-line bg-card shadow-card">
              <div className="border-b border-line px-3 py-3 text-center">
                <p className="font-display text-sm font-bold">{formatDateHeading(day.date, lang)}</p>
                {rounds.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted">
                    {rounds.map((r) => roundLabel.replace("{n}", r)).join(" · ")}
                  </p>
                )}
                {/* Giờ lấy từ lịch gốc cả mùa, đài truyền hình còn dời — nói rõ
                    để người đọc không đặt lịch nhầm rồi mất tin vào cả trang. */}
                {anyProvisional && (
                  <p className="mt-0.5 text-[11px] text-muted/70">{provisionalLabel}</p>
                )}
              </div>
              {day.matches.map((m) => (
                <FixtureRow key={m.id} match={m} lang={lang} />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
