import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveRow } from "@/components/archive-row";
import { getArchiveMonths, getSettledPicks, getThesisTranslations, getTrackRecordForAuthor } from "@/lib/data";
import { formatMonth, formatUnits } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 600;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.archive.title,
    description: dict.archive.subtitle,
    openGraph: { title: `${dict.archive.title} | WildlyPlay`, description: dict.archive.subtitle, images: [{ url: "/api/og/record?page=archive", width: 1200, height: 630 }] },
    alternates: buildAlternates("/archive", lang),
  };
}

function filterHref(params: Record<string, string | undefined>, lang: Lang): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return withLang(s ? `/archive?${s}` : "/archive", lang);
}

export default async function PlayArchive({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const dict = getDict(lang);
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : undefined;
  const resultFilter = typeof sp.result === "string" ? sp.result : undefined;
  const leagueFilter = typeof sp.league === "string" ? sp.league : undefined;

  const [allPicks, record, scoutRecord, months] = await Promise.all([
    getSettledPicks(month),
    getTrackRecordForAuthor("curator"),
    getTrackRecordForAuthor("scout"),
    getArchiveMonths(),
  ]);

  const curatorPicks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  const scoutPicks = allPicks.filter((p) => p.author === "scout");
  const translations = await getThesisTranslations(allPicks.map((p) => p.id));

  // Normalize league names: strip group/round suffixes + unify WC variants
  const normalizeLeague = (l: string): string => {
    let n = l.replace(/\s*[—–-]\s*(Group\s+\w+(\s*\(MD\d\))?|Round of \d+|Quarter-final|Semi-final|Final|Group Stage(\s*\(MD\d\))?)$/i, "").trim();
    if (/^(FIFA\s+)?World\s+Cup(\s+2026)?$/i.test(n)) n = "FIFA World Cup 2026";
    return n;
  };

  // Collect unique normalized leagues for filter
  const leagues = [...new Set(allPicks.map((p) => normalizeLeague(p.league)))].sort();

  // Apply filters
  const filterPicks = (picks: typeof allPicks) => {
    let filtered = picks;
    if (resultFilter) filtered = filtered.filter((p) => p.status === resultFilter);
    if (leagueFilter) filtered = filtered.filter((p) => normalizeLeague(p.league) === leagueFilter);
    return filtered;
  };

  const picks = filterPicks(curatorPicks);
  const filteredScout = filterPicks(scoutPicks);
  const currentFilters = { month, result: resultFilter, league: leagueFilter };

  return (
    <div className="mx-auto max-w-[1100px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.nav.trackRecord, url: "/track-record" }, { name: dict.archive.title, url: "/archive" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.archive.title}</h1>
        <p className="mt-3 text-muted">{dict.archive.subtitle}</p>
        <p className="mt-2 text-xs text-muted">{dict.archive.unitsNote}</p>
      </section>

      {/* Filters */}
      <nav className="flex flex-wrap gap-2 pb-4" aria-label="Filters">
        {/* Month filter */}
        <Link
          href={filterHref({ ...currentFilters, month: undefined }, lang)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${!month ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
        >
          {dict.archive.allMonths}
        </Link>
        {months.map((m) => (
          <Link
            key={m}
            href={filterHref({ ...currentFilters, month: m }, lang)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${month === m ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
          >
            {formatMonth(m, lang)}
          </Link>
        ))}

        <span className="mx-1 self-center text-line">|</span>

        {/* Result filter */}
        {(["won", "lost", "push"] as const).map((r) => (
          <Link
            key={r}
            href={filterHref({ ...currentFilters, result: resultFilter === r ? undefined : r }, lang)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${resultFilter === r ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </Link>
        ))}

        {leagues.length > 1 && (
          <>
            <span className="mx-1 self-center text-line">|</span>
            {leagues.map((l) => (
              <Link
                key={l}
                href={filterHref({ ...currentFilters, league: leagueFilter === l ? undefined : l }, lang)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${leagueFilter === l ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
              >
                {l}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Sticky record summary */}
      <div className="sticky top-16 z-40 -mx-5 border-y border-line bg-bg/90 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <p className="font-display">
            <span className="mr-2 text-sm text-muted">{dict.archive.record}</span>
            <span className="text-xl font-bold text-ink">{record.wins}-{record.losses}-{record.pushes}</span>
          </p>
          <p className="font-display">
            <span className="mr-2 text-sm text-muted">{dict.archive.unitsPl}</span>
            <span className={`text-xl font-bold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}>{formatUnits(record.units_pl)}</span>
          </p>
          <p className="text-sm text-muted">{record.settled} {dict.archive.settledPlays}</p>
        </div>
      </div>

      {/* Curator picks — compact rows with expand */}
      <section className="mt-6 pb-8">
        <h2 className="mb-4 font-display text-xl font-bold">The Curator</h2>
        {picks.length === 0 ? (
          <div className="rounded-card border border-line bg-card px-6 py-12 text-center text-muted">{dict.archive.empty}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {picks.map((pick) => (
              <ArchiveRow key={pick.id} pick={pick} lang={lang} thesisText={translations[pick.id]?.[lang] ?? pick.thesis} />
            ))}
          </div>
        )}
      </section>

      {/* Scout section */}
      {filteredScout.length > 0 && (
        <section className="mb-8 rounded-card border border-dashed border-[#6b9e9e]/40 bg-[#6b9e9e]/[.04] px-5 py-8">
          <div className="mb-4 text-center">
            <h2 className="font-display text-xl font-bold text-[#6b9e9e]">The Scout</h2>
            <p className="mt-1 text-xs text-muted">AI-operated · separate ledger · lower confidence</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#6b9e9e]/30 bg-[#6b9e9e]/10 px-3.5 py-1 font-display text-xs">
              <span className="font-semibold text-ink">{scoutRecord.wins}-{scoutRecord.losses}-{scoutRecord.pushes}</span>
              <span className={`font-semibold ${scoutRecord.units_pl >= 0 ? "text-brand" : "text-loss"}`}>{formatUnits(scoutRecord.units_pl)}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {filteredScout.map((pick) => (
              <ArchiveRow key={pick.id} pick={pick} lang={lang} thesisText={translations[pick.id]?.[lang] ?? pick.thesis} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
