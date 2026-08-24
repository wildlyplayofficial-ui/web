import type { Metadata } from "next";
import {
  getOddsBoard,
  leagueLabelForCompetition,
  type MarketLine,
  type OddsBoardMatch,
} from "@/lib/odds-data";
import { locales } from "@/lib/format";
import { resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

/**
 * Trang Kèo (Nick 23/8) — kèo Bet365 hiện tại + kèo đã chạy thế nào từ lúc mở
 * tới giờ, cộng xác suất thực sau khi bóc phần nhà cái giữ lại. CHỈ HIỂN THỊ
 * số liệu tham khảo — không nút đăng ký/khuyến mãi nhà cái, không dẫn link cá
 * cược (ranh giới đã chốt cùng Nick/Peter khi bật tính năng).
 *
 * v1.1 (Nick 24/8): nhóm theo ngày (vừa là lịch thi đấu vừa là bảng kèo — coi
 * ảnh mẫu tham khảo alo88r), kèo chạy tô xanh khi tăng/đỏ khi giảm, giờ đá to
 * rõ thay vì chữ nhỏ mờ. CHƯA làm trong đợt này (cần "use client" riêng, xin
 * làm PR sau để tách rủi ro): bộ lọc đội/giải/ngày, thu gọn-bấm-mở mỗi trận.
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

/** Một mục kèo chạy: "Chủ 1.95→1.85", tô xanh khi số TĂNG, đỏ khi số GIẢM
 *  (Nick 24/8) — không gắn nghĩa thắng/thua, chỉ tô theo chiều con số đổi. */
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

/** Giờ đá — khối riêng, to rõ (Nick 24/8: "để ý cột đầu tiên... cần có thời
 *  gian để user vừa có kèo vừa có lịch thi đấu"). Giờ theo NGÔN NGỮ TRANG
 *  (bản vi ra giờ VN, còn lại UTC) — giữ đúng sửa của Gwen (PR #116 tương tự). */
function KickoffBlock({ iso, lang }: { iso: string; lang: Lang }) {
  const date = new Date(iso);
  const zone = lang === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(date);
  return (
    <div className="flex shrink-0 flex-col items-center rounded-lg bg-brand-dim/40 px-3 py-1.5">
      <span className="font-display text-lg font-bold tabular-nums text-ink">{time}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">
        {lang === "vi" ? "giờ VN" : "UTC"}
      </span>
    </div>
  );
}

function MatchCard({ match, lang }: { match: OddsBoardMatch; lang: Lang }) {
  return (
    <div className="rounded-card border border-line bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <KickoffBlock iso={match.kickoffUtc} lang={lang} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{leagueLabelForCompetition(match.competitionId)}</p>
            <h2 className="truncate font-display text-lg font-bold text-ink">
              {match.homeTeam} vs {match.awayTeam}
            </h2>
          </div>
        </div>
      </div>

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

interface DayGroup {
  dateKey: string;
  matches: OddsBoardMatch[];
}

/** Nhóm theo NGÀY LỊCH THEO NGÔN NGỮ TRANG (vi → giờ VN, còn lại UTC) — cùng
 *  cách làm với groupByLocalDate trong league-fixtures.tsx, để một trận 23:30
 *  giờ VN không lọt sang nhóm ngày hôm sau theo UTC. */
function groupByDate(matches: OddsBoardMatch[], lang: Lang): DayGroup[] {
  const zone = lang === "vi" ? "Asia/Ho_Chi_Minh" : "UTC";
  const groups = new Map<string, OddsBoardMatch[]>();
  for (const m of matches) {
    const d = new Date(m.kickoffUtc);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayMatches]) => ({ dateKey, matches: dayMatches }));
}

function formatDateHeading(dateKey: string, lang: Lang): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(locales[lang], {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default async function OddsBoardPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const matches = await getOddsBoard();
  const days = groupByDate(matches, lang);

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
        <div className="flex flex-col gap-8 pb-10">
          {days.map((day) => (
            <section key={day.dateKey}>
              <h2 className="mb-3 font-display text-base font-bold capitalize text-ink">
                {formatDateHeading(day.dateKey, lang)}
              </h2>
              <div className="flex flex-col gap-5">
                {day.matches.map((m) => (
                  <MatchCard key={m.eventId} match={m} lang={lang} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
