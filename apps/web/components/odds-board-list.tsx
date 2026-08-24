"use client";

import { useState } from "react";
import { leagueLabelForCompetition, type MarketLine, type OddsBoardMatch } from "@/lib/odds-data";
import type { Lang } from "@/lib/i18n";

/**
 * Danh sách trận + kèo — CLIENT component (Nick 24/8: "bắt buộc phải gọn cho
 * tiện user", nhiều trận liệt kê đầy đủ như card cũ thì dài vô tận). Mỗi trận
 * mặc định 1 DÒNG GỌN (giờ + tên trận + 1X2 chính); bấm vào mới xoè đủ chi
 * tiết (xác suất thực, kèo châu Á, tài/xỉu, kèo chạy tô màu).
 */

interface DayGroup {
  dateKey: string;
  heading: string;
  matches: OddsBoardMatch[];
}

const MARKET_LABEL: Record<string, string> = {
  ML: "1X2",
  Spread: "Kèo châu Á",
  Totals: "Tài / Xỉu",
  "European Handicap": "Kèo châu Âu",
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function OddsCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-card px-3 py-2 min-w-[72px]">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-sm font-semibold text-ink tabular-nums">
        {value != null ? value.toFixed(2) : "—"}
      </span>
    </div>
  );
}

function MoveItem({ label, from, to }: { label: string; from: number | null; to: number | null }) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "—");
  const color = from != null && to != null && to !== from ? (to > from ? "text-brand" : "text-loss") : "text-ink";
  return (
    <span>
      {label} {fmt(from)}→<span className={`font-semibold ${color}`}>{fmt(to)}</span>
    </span>
  );
}

function MoveNote({ line }: { line: MarketLine }) {
  const { open, current } = line;
  const pairs: Array<[string, number | null, number | null]> = [
    ["Chủ", open.home_odds, current.home_odds],
    ["Hòa", open.draw_odds, current.draw_odds],
    ["Khách", open.away_odds, current.away_odds],
    ["Tài", open.over_odds, current.over_odds],
    ["Xỉu", open.under_odds, current.under_odds],
  ];
  const changed = pairs.filter(([, a, b]) => a !== b && a != null && b != null);
  if (changed.length === 0) return <p className="mt-1 text-xs text-muted">Chưa đổi từ lúc mở kèo.</p>;
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
      <span className="text-muted">Kèo chạy:</span>
      {changed.map(([label, a, b]) => (
        <MoveItem key={label} label={label} from={a} to={b} />
      ))}
    </p>
  );
}

function MarketBlock({ market, lines }: { market: string; lines: MarketLine[] }) {
  return (
    <div className="mt-3 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {MARKET_LABEL[market] ?? market}
      </h3>
      {lines.map((line) => {
        const c = line.current;
        const isTotals = market === "Totals";
        return (
          <div key={`${market}-${line.hdp ?? "x"}`} className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              {line.hdp != null && (
                <span className="text-xs font-medium text-muted">
                  {isTotals ? `Mức ${line.hdp} bàn` : `Mức ${line.hdp > 0 ? `+${line.hdp}` : line.hdp}`}
                </span>
              )}
              {isTotals ? (
                <>
                  <OddsCell label="Tài" value={c.over_odds} />
                  <OddsCell label="Xỉu" value={c.under_odds} />
                </>
              ) : (
                <>
                  <OddsCell label="Chủ" value={c.home_odds} />
                  {c.draw_odds != null && <OddsCell label="Hòa" value={c.draw_odds} />}
                  <OddsCell label="Khách" value={c.away_odds} />
                </>
              )}
            </div>
            <MoveNote line={line} />
          </div>
        );
      })}
    </div>
  );
}

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
          <p className="text-[11px] font-medium text-muted">{leagueLabelForCompetition(match.competitionId)}</p>
          <p className="truncate font-display text-base font-bold text-ink">
            {match.homeTeam} vs {match.awayTeam}
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
          {match.trueProb && (
            <div className="rounded-lg bg-brand-dim/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                Xác suất thực (đã bóc phần nhà cái giữ {pct(match.trueProb.margin)})
              </p>
              <p className="mt-1 text-sm text-ink">
                {match.homeTeam} {pct(match.trueProb.home)} · Hòa {pct(match.trueProb.draw)} · {match.awayTeam}{" "}
                {pct(match.trueProb.away)}
              </p>
            </div>
          )}

          {Object.entries(match.markets).map(([market, lines]) => (
            <MarketBlock key={market} market={market} lines={lines} />
          ))}

          <p className="mt-4 text-[11px] text-muted">
            Kèo Bet365, {match.snapshotCount} lát cắt đã ghi nhận · Chỉ mang tính tham khảo, không phải lời mời cá
            cược.
          </p>
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
          <h2 className="mb-3 font-display text-base font-bold capitalize text-ink">{day.heading}</h2>
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
