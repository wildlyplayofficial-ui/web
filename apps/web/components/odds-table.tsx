import { Fragment } from "react";
import { leagueLabelForCompetition, type MarketLine, type OddsBoardMatch } from "@/lib/odds-data";

/**
 * Bảng kèo kiểu trang nhà cái (Nick 25/8: "user quen nhìn kiểu này rồi").
 * Sáu cột: chấp / tài xỉu / 1X2, mỗi thứ hai bản — toàn trận và hiệp 1.
 *
 * CHỈ dùng cho màn hình rộng. Điện thoại vẫn là dòng gọn bấm-mở của
 * OddsBoardList — nhét sáu cột vào 390px thì không đọc nổi.
 *
 * Kèo hiệp 1 mới bắt đầu thu 25/8; trận thu trước mốc đó ba cột phải sẽ trống,
 * không phải lỗi (kèo quá khứ không mua lại được).
 */

interface DayGroup {
  dateKey: string;
  heading: string;
  matches: OddsBoardMatch[];
}

/** Số kèo. Tăng so với lúc mở = xanh, giảm = đỏ, chưa đổi = chữ thường. */
function So({ hien, mo }: { hien: number | null; mo?: number | null }) {
  if (hien == null) return <span className="text-muted">–</span>;
  const mau =
    mo == null || mo === hien ? "text-ink" : hien > mo ? "text-brand" : "text-loss";
  return <span className={`tabular-nums font-semibold ${mau}`}>{hien.toFixed(2)}</span>;
}

/** Mức chấp / mức tài xỉu, in kèm dấu như bảng nhà cái. */
function Muc({ hdp, totals = false }: { hdp: number | null; totals?: boolean }) {
  if (hdp == null) return null;
  const chu = totals ? String(hdp) : hdp > 0 ? `+${hdp}` : String(hdp);
  return <span className="mr-2 text-[11px] text-muted tabular-nums">{chu}</span>;
}

/** Một ô kèo hai vế (chấp: chủ/khách · tài xỉu: tài/xỉu). */
function OChap({ line, totals = false }: { line?: MarketLine; totals?: boolean }) {
  if (!line) return <td className="border-l border-line px-2 py-1" />;
  const c = line.current;
  const o = line.open;
  return (
    <td className="border-l border-line px-2 py-1 align-top">
      <div className="flex items-baseline whitespace-nowrap">
        <Muc hdp={line.hdp} totals={totals} />
        <So hien={totals ? c.over_odds : c.home_odds} mo={totals ? o.over_odds : o.home_odds} />
      </div>
      <div className="flex items-baseline whitespace-nowrap">
        <span className="mr-2 text-[11px] text-muted">{totals ? "x" : ""}</span>
        <So hien={totals ? c.under_odds : c.away_odds} mo={totals ? o.under_odds : o.away_odds} />
      </div>
    </td>
  );
}

/** Ô 1X2 — ba số chủ / hoà / khách xếp dọc, khớp ba dòng tên đội bên trái. */
function O1x2({ line }: { line?: MarketLine }) {
  if (!line) return <td className="border-l border-line px-2 py-1" />;
  const c = line.current;
  const o = line.open;
  return (
    <td className="border-l border-line px-2 py-1 text-right align-top">
      <div><So hien={c.home_odds} mo={o.home_odds} /></div>
      <div><So hien={c.away_odds} mo={o.away_odds} /></div>
      <div><So hien={c.draw_odds} mo={o.draw_odds} /></div>
    </td>
  );
}

const COT = [
  "Chấp Toàn Trận", "Tài Xỉu Toàn Trận", "1X2 Toàn Trận",
  "Chấp Hiệp 1", "Tài Xỉu Hiệp 1", "1X2 Hiệp 1",
];

function gioVN(iso: string): { ngay: string; gio: string } {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o }).format(d);
  return { ngay: f({ day: "2-digit", month: "2-digit" }), gio: f({ hour: "2-digit", minute: "2-digit", hour12: false }) };
}

function KhoiTran({ match }: { match: OddsBoardMatch }) {
  const chap = match.markets.Spread ?? [];
  const tx = match.markets.Totals ?? [];
  const chapH1 = match.markets["Spread HT"] ?? [];
  const txH1 = match.markets["Totals HT"] ?? [];
  const ml = match.markets.ML?.[0];
  const mlH1 = match.markets["ML HT"]?.[0];
  const soDong = Math.max(1, chap.length, tx.length, chapH1.length, txH1.length);
  const { ngay, gio } = gioVN(match.kickoffUtc);

  return (
    <>
      {Array.from({ length: soDong }, (_, i) => (
        <tr key={i} className="border-t border-line align-top">
          {i === 0 && (
            <td rowSpan={soDong} className="w-[280px] px-3 py-2 align-top">
              <div className="text-[11px] text-muted tabular-nums">{ngay} · {gio}</div>
              <div className="mt-0.5 font-semibold text-ink">{match.homeTeam}</div>
              <div className="font-semibold text-ink">{match.awayTeam}</div>
              <div className="text-muted">Hoà</div>
            </td>
          )}
          <OChap line={chap[i]} />
          <OChap line={tx[i]} totals />
          {i === 0 ? <O1x2 line={ml} /> : <td className="border-l border-line" />}
          <OChap line={chapH1[i]} />
          <OChap line={txH1[i]} totals />
          {i === 0 ? <O1x2 line={mlH1} /> : <td className="border-l border-line" />}
        </tr>
      ))}
    </>
  );
}

export function OddsTable({ days }: { days: DayGroup[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-line lg:block">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr className="bg-card text-[11px] uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-left font-semibold">Trận Đấu</th>
            {COT.map((c) => (
              <th key={c} className="border-l border-line px-2 py-2 text-left font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        {days.map((day) => (
          <tbody key={day.dateKey}>
            <tr>
              <td colSpan={7} className="bg-brand-dim/40 px-3 py-1.5 font-display text-xs font-bold capitalize text-brand">
                {day.heading}
              </td>
            </tr>
            {day.matches.map((m) => (
              <Fragment key={m.eventId}>
                <tr>
                  <td colSpan={7} className="bg-card/60 px-3 py-1 text-[11px] font-semibold text-muted">
                    {leagueLabelForCompetition(m.competitionId)}
                  </td>
                </tr>
                <KhoiTran match={m} />
              </Fragment>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
