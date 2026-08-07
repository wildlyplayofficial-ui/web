"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Một trận = một hàng ngang: tên đội nhà căn phải, giờ ở giữa, đội khách căn
 *  trái. Bỏ cột sân và mũi tên so với bản trước — Peter đưa mẫu Fantasy Premier
 *  League 7/8 và muốn gọn như vậy, sân đã có ở trang trận rồi. */
function FixtureRow({ match, lang }: { match: KnockoutMatch; lang: Lang }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const href = match.time
    ? withLang(
        `/match/${buildMatchSlug(match.homeName, match.awayName, `${match.date}T${match.time}:00Z`)}`,
        lang,
      )
    : null;

  const row = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3.5">
      <span className="flex min-w-0 items-center justify-end gap-2.5 text-right text-sm">
        <span className="truncate">{match.homeName}</span>
        <TeamCrest name={match.homeName} />
      </span>

      {/* Trận provisional KHÔNG in giờ. Lịch gốc nhét giờ mặc định cho phần mùa
          chưa xếp: 200/380 trận cùng đúng 12:00 UTC, từ vòng 19 trở đi cả 10
          trận một vòng cùng một giờ. In ra là bịa một con số trông rất thật —
          người đọc đặt lịch xem theo rồi hụt. Ngày thì đúng, giữ nguyên. */}
      <span className="w-[74px] shrink-0 text-center font-display text-base font-bold tabular-nums">
        {hasScore ? (
          `${match.homeScore} - ${match.awayScore}`
        ) : match.provisional ? (
          <span className="text-sm font-semibold text-muted">--:--</span>
        ) : match.time ? (
          <LocalKickoffTime
            iso={`${match.date}T${match.time}:00Z`}
            className="font-display text-base font-bold tabular-nums"
          />
        ) : (
          "—"
        )}
      </span>

      <span className="flex min-w-0 items-center gap-2.5 text-sm">
        <TeamCrest name={match.awayName} />
        <span className="truncate">{match.awayName}</span>
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
  localTimeNote: string;
  prevLabel: string;
  nextLabel: string;
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
  localTimeNote,
  prevLabel,
  nextLabel,
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

  // Gom theo VÒNG thay vì đổ hết 43 nhóm ngày ra một trang. Giải nào không có
  // số vòng (MLS, Liga MX — Livescore để trống) thì rounds rỗng và trang tự
  // quay về kiểu cũ, không vỡ.
  const rounds = useMemo(() => {
    const m = new Map<string, FixtureDay[]>();
    for (const day of groupedDays) {
      for (const match of day.matches) {
        if (!match.round) continue;
        const list = m.get(match.round) ?? [];
        const existing = list.find((d) => d.date === day.date);
        if (existing) existing.matches.push(match);
        else list.push({ date: day.date, matches: [match] });
        m.set(match.round, list);
      }
    }
    return [...m.entries()]
      .sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0))
      .map(([round, ds]) => ({ round, days: ds.sort((x, y) => x.date.localeCompare(y.date)) }));
  }, [groupedDays]);

  // Mở đúng vòng sắp đá chứ không phải vòng 1: giữa mùa mà bắt người ta bấm 20
  // lần mới tới vòng này thì thà đừng phân trang.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (rounds.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const i = rounds.findIndex((r) => r.days[r.days.length - 1].date >= today);
    setIdx(i === -1 ? rounds.length - 1 : i);
  }, [rounds]);

  if (groupedDays.length === 0) return null;

  const heading = label ? (
    <h2 className="mb-6 text-center font-display text-2xl font-bold">{label}</h2>
  ) : null;

  // Không có số vòng → giữ nguyên kiểu đổ theo ngày.
  if (rounds.length === 0) {
    return (
      <section className="mt-12">
        {heading}
        <div className="space-y-4">
          {groupedDays.map((day) => (
            <div key={day.date} className="overflow-hidden rounded-card border border-line bg-card shadow-card">
              <div className="border-b border-line px-3 py-3 text-center">
                <p className="font-display text-sm font-bold">{formatDateHeading(day.date, lang)}</p>
              </div>
              {day.matches.map((m) => (
                <FixtureRow key={m.id} match={m} lang={lang} />
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  const cur = rounds[Math.min(idx, rounds.length - 1)];
  const anyProvisional = cur.days.some((d) => d.matches.some((m) => m.provisional));
  const arrow =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg transition-colors hover:border-line-hover hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted";

  return (
    <section className="mt-12">
      {heading}
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
        <div className="border-b border-line px-3 py-4">
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              className={arrow}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx <= 0}
              aria-label={prevLabel}
            >
              &#8249;
            </button>
            <div className="min-w-[168px] text-center">
              <p className="font-display text-base font-bold">{roundLabel.replace("{n}", cur.round)}</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDateHeading(cur.days[0].date, lang)}
              </p>
            </div>
            <button
              type="button"
              className={arrow}
              onClick={() => setIdx((i) => Math.min(rounds.length - 1, i + 1))}
              disabled={idx >= rounds.length - 1}
              aria-label={nextLabel}
            >
              &#8250;
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-muted/70">
            {anyProvisional ? provisionalLabel : localTimeNote}
          </p>
        </div>

        {cur.days.map((day) => (
          <div key={day.date}>
            <p className="border-t border-line bg-bg/40 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-muted">
              {formatDateHeading(day.date, lang)}
            </p>
            {day.matches.map((m) => (
              <FixtureRow key={m.id} match={m} lang={lang} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
