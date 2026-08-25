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
import { mucTheoBang, sangMalay } from "./odds-filter";

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

function MoveItem({
  label,
  from,
  to,
  malay,
}: {
  label: string;
  from: number | null;
  to: number | null;
  /** Bảng hiện cột chấp/tài xỉu theo kiểu Malay, cột 1X2 theo thập phân.
   *  Chi tiết phải in CÙNG KIỂU, không thì bảng ghi 0.88 mà chi tiết ghi 1.88. */
  malay: boolean;
}) {
  const fmt = (v: number | null) => (v == null ? "—" : (malay ? sangMalay(v) : v).toFixed(2));
  const color = from != null && to != null && to !== from ? (to > from ? "text-brand" : "text-loss") : "text-ink";
  return (
    <span>
      {label} {fmt(from)}→<span className={`font-semibold ${color}`}>{fmt(to)}</span>
    </span>
  );
}

/** Một mức kèo đã đổi: gom các vế thay đổi lại một dòng. */
function dongDaDoi(
  market: string,
  line: MarketLine,
): { nhan: string; doi: Array<[string, number, number]>; malay: boolean } | null {
  const { open: mo, current: gio } = line;
  const cap: Array<[string, number | null, number | null]> = [
    ["Chủ", mo.home_odds, gio.home_odds],
    ["Hòa", mo.draw_odds, gio.draw_odds],
    ["Khách", mo.away_odds, gio.away_odds],
    ["Tài", mo.over_odds, gio.over_odds],
    ["Xỉu", mo.under_odds, gio.under_odds],
  ];
  const doi = cap.filter(([, a, b]) => a != null && b != null && a !== b) as Array<[string, number, number]>;
  if (doi.length === 0) return null;
  const ten = MARKET_LABEL[market] ?? market;
  // Tài/Xỉu là mức bàn thắng, in số trần (2.5). Chỉ kèo chấp mới có dấu +/-.
  const laTaiXiu = market === "Totals" || market === "Totals HT";
  const muc = line.hdp == null ? "" : ` ${laTaiXiu || line.hdp <= 0 ? line.hdp : `+${line.hdp}`}`;
  const malay = market !== "ML" && market !== "ML HT";
  return { nhan: `${ten}${muc}`, doi, malay };
}

/** Bảng phía trên ĐÃ hiện đủ giá hiện tại rồi. Ở đây chỉ nói thêm thứ bảng không
 *  nói được: kèo đã CHẠY thế nào từ lúc mở. Đổ lại toàn bộ ~40 mức chấp xuống
 *  đây là thừa và rối (Nick 25/8: "chỗ chi tiết mình làm nhiều quá"). */
const TOI_DA_DONG = 8;

export function ChiTietTran({ match }: { match: OddsBoardMatch }) {
  // CHỈ những mức bảng phía trên đang hiện — không tự lấy từ nguồn thô.
  const daDoi = mucTheoBang(match.markets)
    .flatMap(({ market, lines }) => lines.map((l) => dongDaDoi(market, l)))
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const hien = daDoi.slice(0, TOI_DA_DONG);
  const con = daDoi.length - hien.length;

  return (
    <div className="flex flex-col gap-3">
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kèo đã chạy từ lúc mở</p>
        {hien.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Chưa mức nào đổi giá.</p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {hien.map((h) => (
              <li key={h.nhan} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="min-w-[168px] text-muted">{h.nhan}</span>
                {h.doi.map(([ve, a, b]) => (
                  <MoveItem key={ve} label={ve} from={a} to={b} malay={h.malay} />
                ))}
              </li>
            ))}
          </ul>
        )}
        {con > 0 && <p className="mt-1.5 text-[11px] text-muted">và {con} mức khác cũng đổi giá.</p>}
      </div>

      <p className="text-[11px] text-muted">
        Kèo Bet365, {match.snapshotCount} lát cắt đã ghi nhận · Chỉ mang tính tham khảo, không phải lời mời cá cược.
      </p>
    </div>
  );
}
