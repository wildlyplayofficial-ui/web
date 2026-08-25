"use client";

import { Fragment, useState } from "react";
import {
  leagueLabelForCompetition,
  leagueLogoForCompetition,
  type MarketLine,
  type OddsBoardMatch,
} from "@/lib/odds-data";
import { ChiTietTran } from "./odds-detail";
import { locMucChinh, sangMalay } from "./odds-filter";

/**
 * Bảng kèo kiểu trang nhà cái (Nick 25/8: "user quen nhìn kiểu này rồi").
 * Sáu cột: chấp / tài xỉu / 1X2, mỗi thứ hai bản — toàn trận và hiệp 1.
 *
 * CHỈ dùng cho màn hình rộng. Điện thoại vẫn là dòng gọn bấm-mở của
 * OddsBoardList — nhét sáu cột vào 390px thì không đọc nổi.
 *
 * Kèo hiệp 1 mới bắt đầu thu 25/8; trận thu trước mốc đó ba cột phải sẽ trống,
 * không phải lỗi (kèo quá khứ không mua lại được).
 *
 * Bấm vào một trận thì xoè ra xác suất thực + kèo đã chạy thế nào (Nick 25/8:
 * "điều này chưa làm được" — câu mô tả dưới tiêu đề trang hứa từ trước mà bảng
 * lớn chưa hề có, chỉ danh sách điện thoại mới có).
 */

interface DayGroup {
  dateKey: string;
  heading: string;
  matches: OddsBoardMatch[];
}

/** Số kèo. Âm = đỏ (quy ước bảng kèo). Mũi tên nhỏ báo tăng/giảm so với lúc mở —
 *  tách khỏi màu để hai thứ không giẫm nhau: MÀU nói dấu, MŨI TÊN nói biến động. */
function So({ hien, mo }: { hien: number | null; mo?: number | null }) {
  if (hien == null) return <span className="text-muted">–</span>;
  const m = sangMalay(hien);
  const chieu = mo == null || mo === hien ? "" : hien > mo ? "▲" : "▼";
  return (
    <span className="whitespace-nowrap">
      <span className={`inline-block w-[40px] text-right tabular-nums font-semibold ${m < 0 ? "text-loss" : "text-ink"}`}>
        {m.toFixed(2)}
      </span>
      <span className={`ml-0.5 inline-block w-[8px] text-[9px] ${hien > (mo ?? 0) ? "text-brand" : "text-muted"}`}>
        {chieu}
      </span>
    </span>
  );
}

/** Cột 1X2 giữ GIÁ THẬP PHÂN, không đổi sang Malay.
 *  Đọc kỹ ảnh mẫu Nick gửi: cột chấp và tài xỉu là số Malay (-0.98 / 0.92),
 *  nhưng cột 1X2 vẫn là thập phân (2.36 / 3.35 / 3.05) và không có số âm.
 *  Bảng nhà cái đâu cũng vậy — đổi cả cột 1X2 sang Malay là sai kiểu. */
function SoThapPhan({ hien, mo }: { hien: number | null; mo?: number | null }) {
  if (hien == null) return <span className="text-muted">–</span>;
  const chieu = mo == null || mo === hien ? "" : hien > mo ? "▲" : "▼";
  return (
    <span className="whitespace-nowrap">
      <span className="inline-block w-[40px] text-right tabular-nums font-semibold text-ink">{hien.toFixed(2)}</span>
      <span className={`ml-0.5 inline-block w-[8px] text-[9px] ${hien > (mo ?? 0) ? "text-brand" : "text-muted"}`}>
        {chieu}
      </span>
    </span>
  );
}

/** Mức chấp / mức tài xỉu, in kèm dấu như bảng nhà cái.
 *
 *  Khung rộng CỐ ĐỊNH và giữ chỗ cả khi rỗng: dòng trên có nhãn ("-0.5"), dòng
 *  dưới không — để nhãn co giãn thì hai số odds trong cùng ô lệch nhau
 *  (Nick 25/8 chỉ trận Sabah Masazir: 0.82 và 0.98 không thẳng hàng). */
function Muc({ chu }: { chu: string }) {
  return <span className="mr-1.5 inline-block w-[30px] shrink-0 text-right text-[11px] text-muted tabular-nums">{chu}</span>;
}

/** Chữ nhãn mức: kèo chấp in dấu +/-, tài xỉu in số trần. */
function nhanMuc(hdp: number | null, totals: boolean): string {
  if (hdp == null) return "";
  return totals ? String(hdp) : hdp > 0 ? `+${hdp}` : String(hdp);
}

/** Một ô kèo hai vế (chấp: chủ/khách · tài xỉu: tài/xỉu). */
function OChap({ line, totals = false }: { line?: MarketLine; totals?: boolean }) {
  if (!line) return <td className={`border-l border-line px-2 py-1 ${NEN_KEO}`} />;
  const c = line.current;
  const o = line.open;
  return (
    <td className={`border-l border-line px-2 py-1 align-top ${NEN_KEO}`}>
      <div className="flex items-baseline whitespace-nowrap">
        <Muc chu={nhanMuc(line.hdp, totals)} />
        <So hien={totals ? c.over_odds : c.home_odds} mo={totals ? o.over_odds : o.home_odds} />
      </div>
      <div className="flex items-baseline whitespace-nowrap">
        <Muc chu={totals ? "x" : ""} />
        <So hien={totals ? c.under_odds : c.away_odds} mo={totals ? o.under_odds : o.away_odds} />
      </div>
    </td>
  );
}

/** Ô 1X2 — ba số chủ / hoà / khách xếp dọc, khớp ba dòng tên đội bên trái. */
function O1x2({ line }: { line?: MarketLine }) {
  if (!line) return <td className={`border-l border-line px-2 py-1 ${NEN_KEO}`} />;
  const c = line.current;
  const o = line.open;
  return (
    <td className={`border-l border-line px-2 py-1 text-right align-top ${NEN_KEO}`}>
      <div><SoThapPhan hien={c.home_odds} mo={o.home_odds} /></div>
      <div><SoThapPhan hien={c.away_odds} mo={o.away_odds} /></div>
      <div><SoThapPhan hien={c.draw_odds} mo={o.draw_odds} /></div>
    </td>
  );
}

/** Nền nhạt cho vùng soi kèo — Nick 25/8: nền trắng chói, cần dồn mắt vào đây. */
const NEN_KEO = "bg-brand-dim/15";

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
  const [moRong, setMoRong] = useState(false);
  const chap = locMucChinh(match.markets.Spread ?? []);
  const tx = locMucChinh(match.markets.Totals ?? []);
  const chapH1 = locMucChinh(match.markets["Spread HT"] ?? []);
  const txH1 = locMucChinh(match.markets["Totals HT"] ?? []);
  const ml = match.markets.ML?.[0];
  const mlH1 = match.markets["ML HT"]?.[0];
  const soDong = Math.max(1, chap.length, tx.length, chapH1.length, txH1.length);
  const { ngay, gio } = gioVN(match.kickoffUtc);
  // Mức chấp chuẩn âm => chủ nhà chấp; dương => khách chấp; không có kèo chấp => không tô ai.
  const mucChuan = chap[0]?.hdp ?? null;
  const chuChap = mucChuan == null || mucChuan === 0 ? null : mucChuan < 0;

  return (
    <>
      {Array.from({ length: soDong }, (_, i) => (
        <tr
          key={i}
          onClick={() => setMoRong((v) => !v)}
          className="cursor-pointer border-t border-line align-top hover:bg-brand-dim/10"
        >
          {i === 0 && (
            <td rowSpan={soDong} className="w-[200px] px-3 py-2 align-top">
              <div className="text-[11px] text-muted tabular-nums">{ngay} · {gio}</div>
              {/* Đội CHẤP kèo tô đỏ (Nick 25/8). Mức chấp âm = đội chủ chấp. */}
              <div className={`mt-0.5 font-semibold ${chuChap ? "text-loss" : "text-ink"}`}>{match.homeTeam}</div>
              <div className={`font-semibold ${chuChap === false ? "text-loss" : "text-ink"}`}>{match.awayTeam}</div>
              <div className="text-muted">Hoà</div>
              <div className="mt-1 text-[11px] text-brand">
                {moRong ? "Thu gọn ▲" : "Xem chi tiết ▼"}
              </div>
            </td>
          )}
          <OChap line={chap[i]} />
          <OChap line={tx[i]} totals />
          {i === 0 ? <O1x2 line={ml} /> : <td className={`border-l border-line ${NEN_KEO}`} />}
          <OChap line={chapH1[i]} />
          <OChap line={txH1[i]} totals />
          {i === 0 ? <O1x2 line={mlH1} /> : <td className={`border-l border-line ${NEN_KEO}`} />}
        </tr>
      ))}
      {moRong && (
        <tr className="border-t border-line">
          <td colSpan={7} className="bg-card/60 px-3 py-3">
            <ChiTietTran match={match} />
          </td>
        </tr>
      )}
    </>
  );
}

export function OddsTable({ days }: { days: DayGroup[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-line bg-card lg:block">
      <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-card text-[11px] uppercase tracking-wide text-muted">
            <th className="w-[200px] px-3 py-2 text-left font-semibold">Trận Đấu</th>
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
                  {/* Nick 25/8: nhãn giải in đậm, cỡ chữ lớn hơn, có logo bên cạnh. */}
                  <td colSpan={7} className="bg-card/60 px-3 py-1.5">
                    <span className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                      {leagueLogoForCompetition(m.competitionId) && (
                        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded bg-white/95 p-[3px]">
                          <img
                            src={leagueLogoForCompetition(m.competitionId)!}
                            alt=""
                            width={16}
                            height={16}
                            className="h-4 w-4 object-contain"
                          />
                        </span>
                      )}
                      {leagueLabelForCompetition(m.competitionId)}
                    </span>
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
