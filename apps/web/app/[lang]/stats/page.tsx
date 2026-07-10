import type { Metadata } from "next";
import { getSettledPicks } from "@/lib/data";
import { formatUnits, locales, marketLabels } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, type Lang } from "@/lib/i18n";
import { cumulativeUnits, groupStats, summarize, type GroupStats } from "@/lib/stats";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

/** Stats page — the full track record sliced by league, market and time.
 *  Everything aggregates from one getSettledPicks() call (lib/stats.ts). */

export const revalidate = 600;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.stats.title,
    description: dict.stats.subtitle,
    openGraph: { title: `${dict.stats.title} | WildlyPlay`, description: dict.stats.subtitle, images: [{ url: "/api/og/record?page=stats", width: 1200, height: 630 }] },
    alternates: buildAlternates("/stats", lang),
  };
}

function formatPct(value: number | null): string {
  if (value === null) return "\u2014";
  const abs = Math.abs(value).toFixed(1);
  return value > 0 ? `+${abs}%` : value < 0 ? `\u2212${abs}%` : `${abs}%`;
}

function plClass(value: number | null): string {
  if (value === null || value === 0) return "text-muted";
  return value > 0 ? "text-brand" : "text-loss";
}

function StatBlock({ label, value, className = "text-ink" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-5 py-4 text-center">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function StatsTable({ heading, firstCol, rows, dict }: {
  heading: string;
  firstCol: string;
  rows: GroupStats[];
  dict: ReturnType<typeof getDict>;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">{heading}</h2>
      <div className="mt-3 overflow-x-auto rounded-card border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-3 font-medium">{firstCol}</th>
              <th className="px-4 py-3 text-right font-medium">{dict.stats.settled}</th>
              <th className="px-4 py-3 text-right font-medium">{dict.archive.record}</th>
              <th className="px-4 py-3 text-right font-medium">{dict.archive.unitsPl}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{row.key}</td>
                <td className="px-4 py-3 text-right text-muted">{row.settled}</td>
                <td className="px-4 py-3 text-right font-display font-semibold text-ink">
                  {row.wins}-{row.losses}-{row.pushes}
                </td>
                <td className={`px-4 py-3 text-right font-display font-semibold ${plClass(row.units_pl)}`}>
                  {formatUnits(row.units_pl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Server-rendered cumulative units P/L line — no client JS, viewBox-scaled. */
function UnitsChart({ points, lang }: { points: { date: string; total: number }[]; lang: Lang }) {
  const W = 1000;
  const H = 300;
  const PAD = 20;
  const PLOT_BOTTOM = H - 40;
  const values = [0, ...points.map((p) => p.total)];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (i: number) =>
    points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + ((max - v) / span) * (PLOT_BOTTOM - PAD);
  const zeroY = y(0);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locales[lang], { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="mt-3 w-full rounded-card border border-line bg-card dark:bg-card" style={{ backgroundColor: "var(--t-chart-bg)" }}>
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="var(--color-line)" strokeWidth={1.5} />
      {points.length > 1 && (
        <>
          <path d={area} fill="var(--color-brand)" opacity={0.12} />
          <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeLinejoin="round" />
        </>
      )}
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].total)} r={5} fill="var(--color-brand)" />
      <text x={PAD} y={H - 12} fill="var(--color-muted)" fontSize={15}>
        {fmtDate(points[0].date)}
      </text>
      <text x={W - PAD} y={H - 12} fill="var(--color-muted)" fontSize={15} textAnchor="end">
        {fmtDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
}

export default async function StatsPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const allPicks = await getSettledPicks();
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  const scoutPicks = allPicks.filter((p) => p.author === "scout");

  const summary = summarize(picks);
  const byLeague = groupStats(picks, (p) => p.league);
  const byMarket = groupStats(picks, (p) => marketLabels[p.market]);
  const points = cumulativeUnits(picks);

  const scoutSummary = scoutPicks.length > 0 ? summarize(scoutPicks) : null;
  const scoutByLeague = scoutPicks.length > 0 ? groupStats(scoutPicks, (p) => p.league) : [];
  const scoutByMarket = scoutPicks.length > 0 ? groupStats(scoutPicks, (p) => marketLabels[p.market]) : [];
  const scoutPoints = scoutPicks.length > 0 ? cumulativeUnits(scoutPicks) : [];

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Stats",url:"/stats"}]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.stats.title}</h1>
        <p className="mt-3 text-muted">{dict.stats.subtitle}</p>
      </section>

      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold text-brand">Main Picks &middot; The Curator</h2>
        <p className="mt-2 text-xs text-muted">Real analyst &middot; highest conviction &middot; primary ledger</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <StatBlock
          label={dict.archive.record}
          value={`${summary.wins}-${summary.losses}-${summary.pushes}`}
        />
        <StatBlock
          label={dict.archive.unitsPl}
          value={formatUnits(summary.units_pl)}
          className={plClass(summary.units_pl)}
        />
        <StatBlock label={dict.stats.settled} value={`${summary.settled}`} />
        <StatBlock label={dict.stats.roi} value={formatPct(summary.roi)} className={plClass(summary.roi)} />
        <StatBlock label={dict.stats.avgClv} value={formatPct(summary.avgClv)} className={plClass(summary.avgClv)} />
      </div>

      {picks.length === 0 ? (
        <div className="mt-10 rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.archive.empty}
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{dict.stats.chartTitle}</h2>
            <UnitsChart points={points} lang={lang} />
          </section>
          <StatsTable heading={dict.stats.byLeague} firstCol={dict.stats.league} rows={byLeague} dict={dict} />
          <StatsTable heading={dict.stats.byMarket} firstCol={dict.stats.market} rows={byMarket} dict={dict} />
        </>
      )}

      {/* ── Scout section — hidden when 0 settled picks (§7.1 rule 2) ── */}
      {scoutSummary && scoutPicks.length > 0 && (
        <section className="mt-14 rounded-card border border-dashed border-[#6b9e9e]/40 bg-[#6b9e9e]/[.04] px-5 py-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-[#6b9e9e]">
              Alternative Picks &middot; The Scout
            </h2>
            <p className="mt-2 text-xs text-muted">
              Fictional, AI-operated WildlyPlay persona &middot; lower confidence &middot; separate ledger
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <StatBlock
              label={dict.archive.record}
              value={`${scoutSummary.wins}-${scoutSummary.losses}-${scoutSummary.pushes}`}
            />
            <StatBlock
              label={dict.archive.unitsPl}
              value={formatUnits(scoutSummary.units_pl)}
              className={plClass(scoutSummary.units_pl)}
            />
            <StatBlock label={dict.stats.settled} value={`${scoutSummary.settled}`} />
            <StatBlock label={dict.stats.roi} value={formatPct(scoutSummary.roi)} className={plClass(scoutSummary.roi)} />
            <StatBlock label={dict.stats.avgClv} value={formatPct(scoutSummary.avgClv)} className={plClass(scoutSummary.avgClv)} />
          </div>

          {scoutPoints.length > 0 && (
            <>
              <h3 className="mt-8 font-display text-lg font-semibold text-[#6b9e9e]">Cumulative Units P/L</h3>
              <UnitsChart points={scoutPoints} lang={lang} />
            </>
          )}

          <StatsTable heading={`${dict.stats.byLeague}`} firstCol={dict.stats.league} rows={scoutByLeague} dict={dict} />
          <StatsTable heading={`${dict.stats.byMarket}`} firstCol={dict.stats.market} rows={scoutByMarket} dict={dict} />
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted">{dict.archive.unitsNote}</p>
    </div>
  );
}
