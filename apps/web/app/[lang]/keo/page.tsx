import type { Metadata } from "next";
import {
  getOddsBoard,
  leagueLabelForCompetition,
  type MarketLine,
  type OddsBoardMatch,
} from "@/lib/odds-data";
import { formatKickoff } from "@/lib/format";
import { resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

/**
 * Trang Kèo (Nick 23/8) — kèo Bet365 hiện tại + kèo đã chạy thế nào từ lúc mở
 * tới giờ, cộng xác suất thực sau khi bóc phần nhà cái giữ lại. CHỈ HIỂN THỊ
 * số liệu tham khảo — không nút đăng ký/khuyến mãi nhà cái, không dẫn link cá
 * cược (ranh giới đã chốt cùng Nick/Peter khi bật tính năng).
 *
 * v1: bảng "Mở kèo → Hiện tại" đơn giản (chưa đủ lát cắt để vẽ biểu đồ đường
 * có ý nghĩa — nâng lên khi dữ liệu dày hơn).
 */

export const revalidate = 900;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const title = "Bảng Kèo Bóng Đá Hôm Nay — Kèo Mở, Kèo Hiện Tại, Xác Suất Thực";
  const description =
    "Kèo 1X2, kèo châu Á, tài xỉu các trận sắp đá — cập nhật mỗi 3 tiếng, kèm xác suất thực sau khi bóc phần nhà cái giữ lại. Chỉ để tham khảo.";
  return {
    title,
    description,
    alternates: { canonical: withLang("/keo", lang) },
    openGraph: { title: `${title} | banhbong.net`, description },
  };
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

function MoveNote({ line }: { line: MarketLine }) {
  const { open, current } = line;
  const changed =
    open.home_odds !== current.home_odds ||
    open.draw_odds !== current.draw_odds ||
    open.away_odds !== current.away_odds ||
    open.over_odds !== current.over_odds ||
    open.under_odds !== current.under_odds;
  if (!changed) return <p className="mt-1 text-xs text-muted">Chưa đổi từ lúc mở kèo.</p>;
  const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "—");
  const parts: string[] = [];
  if (open.home_odds !== current.home_odds) parts.push(`Chủ ${fmt(open.home_odds)}→${fmt(current.home_odds)}`);
  if (open.draw_odds !== current.draw_odds) parts.push(`Hòa ${fmt(open.draw_odds)}→${fmt(current.draw_odds)}`);
  if (open.away_odds !== current.away_odds) parts.push(`Khách ${fmt(open.away_odds)}→${fmt(current.away_odds)}`);
  if (open.over_odds !== current.over_odds) parts.push(`Tài ${fmt(open.over_odds)}→${fmt(current.over_odds)}`);
  if (open.under_odds !== current.under_odds) parts.push(`Xỉu ${fmt(open.under_odds)}→${fmt(current.under_odds)}`);
  return <p className="mt-1 text-xs text-brand">Kèo chạy: {parts.join(" · ")}</p>;
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
                  {/* Tài/xỉu: hdp là mức TỔNG BÀN, không có dấu +/- như kèo chấp. */}
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

function MatchCard({ match, lang }: { match: OddsBoardMatch; lang: Lang }) {
  return (
    <div className="rounded-card border border-line bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">
          {leagueLabelForCompetition(match.competitionId)}
        </span>
        {/* Giờ theo NGÔN NGỮ TRANG: bản vi ra giờ VN, các bản khác ra UTC.
            Đóng cứng "vi" thì trang /en, /th, /es đều ghi "giờ VN" — đúng kiểu
            lỗi VI sót lại mà Nick từng bắt (PR #116). */}
        <span className="text-xs text-muted">{formatKickoff(match.kickoffUtc, lang)}</span>
      </div>
      <h2 className="mt-1 font-display text-lg font-bold text-ink">
        {match.homeTeam} vs {match.awayTeam}
      </h2>

      {match.trueProb && (
        <div className="mt-3 rounded-lg bg-brand-dim/30 px-4 py-3">
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

export default async function OddsBoardPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const matches = await getOddsBoard();

  return (
    <div className="mx-auto max-w-[900px] px-5 overflow-x-hidden">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Bảng Kèo", url: "/keo" }]} />
      <section className="pt-10 pb-6">
        <h1 className="font-display text-3xl font-bold">Bảng Kèo Bóng Đá</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Kèo 1X2, kèo châu Á, tài xỉu — cập nhật mỗi 3 tiếng. Mỗi trận đi kèm xác suất thực sau khi bóc
          phần nhà cái giữ lại, và kèo đã chạy thế nào từ lúc mở tới giờ. Chỉ để tham khảo — banhbong.net
          không tổ chức cá cược.
        </p>
      </section>

      {matches.length === 0 ? (
        <div className="rounded-card border border-dashed border-brand/30 bg-brand-dim/20 px-5 py-10 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Chưa có kèo trong 4 ngày tới</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Dữ liệu kèo cập nhật mỗi 3 tiếng — quay lại sau nhé.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-10">
          {matches.map((m) => (
            <MatchCard key={m.eventId} match={m} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
