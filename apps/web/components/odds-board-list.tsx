"use client";

import { useState } from "react";
import {
  leagueLabelForCompetition,
  leagueLogoForCompetition,
  type OddsBoardMatch,
} from "@/lib/odds-data";
import type { DayGroup } from "./odds-filter";
import { ChiTietTran, pct } from "./odds-detail";
import type { Lang } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";

/**
 * Danh sách trận + kèo — CLIENT component (Nick 24/8: "bắt buộc phải gọn cho
 * tiện user", nhiều trận liệt kê đầy đủ như card cũ thì dài vô tận). Mỗi trận
 * mặc định 1 DÒNG GỌN (giờ + tên trận + 1X2 chính); bấm vào mới xoè đủ chi
 * tiết (xác suất thực, kèo châu Á, tài/xỉu, kèo chạy tô màu).
 */



function KickoffTime({ iso, lang }: { iso: string; lang: Lang }) {
  const zone = lang === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(new Date(iso));
  return <span className="font-display text-base font-bold tabular-nums text-ink">{time}</span>;
}

/** Dòng gọn: giờ + tên trận + 1X2 hiện tại (nếu có). Bấm để xoè chi tiết. */
function MatchRow({ match, lang }: { match: OddsBoardMatch; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const ml = match.markets.ML?.[0]?.current;

  return (
    <div className="rounded-card border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex shrink-0 flex-col items-center rounded-lg bg-brand-dim/40 px-2.5 py-1">
          <KickoffTime iso={match.kickoffUtc} lang={lang} />
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {lang === "vi" ? "giờ VN" : "UTC"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          {/* Nick 25/8: nhãn giải in đậm, cỡ chữ lớn hơn, có logo bên cạnh. */}
          <p className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
            {leagueLogoForCompetition(match.competitionId) && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/95 p-[2px]">
                <img
                  src={leagueLogoForCompetition(match.competitionId)!}
                  alt=""
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain"
                />
              </span>
            )}
            {leagueLabelForCompetition(match.competitionId)}
          </p>
          <p className="flex items-center gap-1.5 truncate font-display text-base font-bold text-ink">
            <TeamCrest name={match.homeTeam} />
            <span className="truncate">
              {match.homeTeam} vs {match.awayTeam}
            </span>
            <TeamCrest name={match.awayTeam} />
          </p>
        </div>
        {ml && (
          <div className="hidden shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted sm:flex">
            <span className="rounded border border-line px-1.5 py-0.5">{ml.home_odds?.toFixed(2) ?? "—"}</span>
            {ml.draw_odds != null && (
              <span className="rounded border border-line px-1.5 py-0.5">{ml.draw_odds.toFixed(2)}</span>
            )}
            <span className="rounded border border-line px-1.5 py-0.5">{ml.away_odds?.toFixed(2) ?? "—"}</span>
          </div>
        )}
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-4 pt-3">
          <ChiTietTran match={match} />
        </div>
      )}
    </div>
  );
}

export function OddsBoardList({ days, lang }: { days: DayGroup[]; lang: Lang }) {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {days.map((day) => (
        <section key={day.dateKey}>
          {/* Ngày tháng là NHÃN GIAO DIỆN, không phải mục nội dung. Để H2 thì dàn
              bài thành H1 → "Thứ Ba, 25/8" → ... → H2 bài SEO, máy đọc cấu trúc
              tưởng trang nói về ngày tháng. Bản này còn nằm trong khối ẩn ở màn
              rộng nên H2 vẫn vào dàn bài dù người dùng máy tính không thấy. */}
          <p className="mb-3 font-display text-base font-bold capitalize text-ink">{day.heading}</p>
          <div className="flex flex-col gap-3">
            {day.matches.map((m) => (
              <MatchRow key={m.eventId} match={m} lang={lang} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
