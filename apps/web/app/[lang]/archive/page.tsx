import type { Metadata } from "next";
import Link from "next/link";
import { PickCard } from "@/components/pick-card";
import { getArchiveMonths, getSettledPicks, getThesisTranslations, getTrackRecord } from "@/lib/data";
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
    openGraph: { title: `${dict.archive.title} | WildlyPlay`, description: dict.archive.subtitle, images: [{ url: "/og-home.png", width: 1200, height: 630 }] },
    alternates: buildAlternates("/archive", lang),
  };
}

function monthHref(month: string | null, lang: Lang): string {
  const base = month ? `/archive?month=${month}` : "/archive";
  return withLang(base, lang);
}

export default async function PlayArchive({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const dict = getDict(lang);
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month)
    ? sp.month
    : undefined;

  const [allPicks, record, months] = await Promise.all([
    getSettledPicks(month),
    getTrackRecord(),
    getArchiveMonths(),
  ]);
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  const scoutPicks = allPicks.filter((p) => p.author === "scout");
  const translations = await getThesisTranslations(allPicks.map((p) => p.id));

  return (
    <div className="mx-auto max-w-[1100px] px-5">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Archive",url:"/archive"}]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.archive.title}</h1>
        <p className="mt-3 text-muted">{dict.archive.subtitle}</p>
      </section>

      {/* Sticky summary: W-L-P badge record AND real units P/L side by side (decision #2) */}
      <div className="sticky top-16 z-40 -mx-5 border-y border-line bg-bg/90 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <p className="font-display">
            <span className="mr-2 text-sm text-muted">{dict.archive.record}</span>
            <span className="text-xl font-bold text-ink">
              {record.wins}-{record.losses}-{record.pushes}
            </span>
          </p>
          <p className="font-display">
            <span className="mr-2 text-sm text-muted">{dict.archive.unitsPl}</span>
            <span
              className={`text-xl font-bold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
            >
              {formatUnits(record.units_pl)}
            </span>
          </p>
          <p className="text-sm text-muted">
            {record.settled} {dict.archive.settledPlays}
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted">{dict.archive.unitsNote}</p>

      {months.length > 0 && (
        <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Filter by month">
          <Link
            href={monthHref(null, lang)}
            className={`rounded-full border px-4 py-1.5 font-display text-sm transition-colors ${
              !month
                ? "border-brand/40 bg-brand-dim text-brand"
                : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            {dict.archive.allMonths}
          </Link>
          {months.map((m) => (
            <Link
              key={m}
              href={monthHref(m, lang)}
              className={`rounded-full border px-4 py-1.5 font-display text-sm transition-colors ${
                month === m
                  ? "border-brand/40 bg-brand-dim text-brand"
                  : "border-line bg-card text-muted hover:text-ink"
              }`}
            >
              {formatMonth(m, lang)}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-8 pb-8">
        {picks.length === 0 ? (
          <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
            {dict.archive.empty}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {picks.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                lang={lang}
                thesisText={translations[pick.id]?.[lang] ?? pick.thesis}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Scout section — hidden when 0 settled picks (§7.1 rule 2) ── */}
      {scoutPicks.length > 0 && (
        <section className="mt-14 rounded-card border border-dashed border-[#6b9e9e]/40 bg-[#6b9e9e]/[.04] px-5 py-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-[#6b9e9e]">
              Alternative Picks &middot; The Scout
            </h2>
            <p className="mt-2 text-xs text-muted">
              Fictional, AI-operated WildlyPlay persona &middot; lower confidence &middot; separate ledger
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {scoutPicks.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                lang={lang}
                thesisText={translations[pick.id]?.[lang] ?? pick.thesis}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
