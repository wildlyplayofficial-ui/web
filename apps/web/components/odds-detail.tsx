"use client";

/**
 * Chi tiết một trận: xác suất thực (đã bóc phần nhà cái giữ lại) + kèo đã chạy
 * thế nào từ lúc mở tới giờ.
 *
 * Tách khỏi odds-board-list để BẢNG LỚN dùng chung — trước đây chỉ danh sách
 * điện thoại mới xoè được, còn bảng lớn bấm vào không ra gì, dù câu mô tả dưới
 * tiêu đề trang vẫn hứa (Nick 25/8: "điều này chưa làm được").
 */
import type { MarketLine, OddsBoardMatch } from "@/lib/odds-data";

const MARKET_LABEL: Record<string, string> = {
  ML: "1X2 (thắng / hoà / thua)",
  Spread: "Kèo châu Á (chấp)",
  Totals: "Tài / Xỉu",
  "European Handicap": "Kèo chấp châu Âu",
  "ML HT": "1X2 hiệp 1",
  "Spread HT": "Kèo châu Á hiệp 1",
  "Totals HT": "Tài / Xỉu hiệp 1",
};

export function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function OddsCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col rounded-lg border border-line px-2.5 py-1.5">
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

export function MarketBlock({ market, lines }: { market: string; lines: MarketLine[] }) {
  return (
    <div className="mt-3 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {MARKET_LABEL[market] ?? market}
      </h3>
      {lines.map((line) => {
        const c = line.current;
        const isTotals = market === "Totals" || market === "Totals HT";
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

export function ChiTietTran({ match }: { match: OddsBoardMatch }) {
  return (
    <div>
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
        Kèo Bet365, {match.snapshotCount} lát cắt đã ghi nhận · Chỉ mang tính tham khảo, không phải lời mời cá cược.
      </p>
    </div>
  );
}
