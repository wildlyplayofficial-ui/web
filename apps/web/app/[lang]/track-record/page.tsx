import type { Metadata } from "next";
import Link from "next/link";
import { getTrackRecordForAuthor } from "@/lib/data";
import { formatUnits } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.nav.trackRecord} | WildlyPlay`,
    description: dict.archive.subtitle,
    alternates: buildAlternates("/track-record", lang),
    openGraph: {
      title: `${dict.nav.trackRecord} | WildlyPlay`,
      description: dict.archive.subtitle,
      images: [{ url: "/api/og/record?page=archive", width: 1200, height: 630 }],
    },
  };
}

export default async function TrackRecordHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [curator, scout] = await Promise.all([
    getTrackRecordForAuthor("curator"),
    getTrackRecordForAuthor("scout"),
  ]);

  const sections = [
    {
      title: dict.archive.title,
      description: dict.archive.subtitle,
      href: "/archive",
      accent: "border-brand/30 bg-brand-dim/30",
    },
    {
      title: dict.stats.title,
      description: dict.stats.subtitle,
      href: "/stats",
      accent: "border-blue-400/30 bg-blue-400/10",
    },
    {
      title: dict.transparency.title,
      description: dict.transparency.subtitle,
      href: "/transparency",
      accent: "border-amber-400/30 bg-amber-400/10",
    },
  ];

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.nav.trackRecord, url: "/track-record" }]} />

      <section className="text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.nav.trackRecord}</h1>
        <p className="mx-auto mt-3 max-w-[600px] text-muted">{dict.archive.subtitle}</p>
      </section>

      {/* Live record summary */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-brand/30 bg-brand-dim/30 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-bg">C</span>
            <span className="font-display text-lg font-bold">The Curator</span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold">{curator.wins}-{curator.losses}-{curator.pushes}</span>
            <span className={`font-display text-lg font-semibold ${curator.units_pl >= 0 ? "text-brand" : "text-loss"}`}>
              {formatUnits(curator.units_pl)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{curator.settled} settled plays</p>
        </div>

        {scout.settled > 0 && (
          <div className="rounded-card border border-[#6b9e9e]/30 bg-[#6b9e9e]/[.06] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b9e9e] text-sm font-bold text-bg">S</span>
              <span className="font-display text-lg font-bold">The Scout</span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold">{scout.wins}-{scout.losses}-{scout.pushes}</span>
              <span className={`font-display text-lg font-semibold ${scout.units_pl >= 0 ? "text-[#6b9e9e]" : "text-loss"}`}>
                {formatUnits(scout.units_pl)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{scout.settled} settled plays · AI-operated</p>
          </div>
        )}
      </div>

      {/* Section links */}
      <div className="mt-10 flex flex-col gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={withLang(s.href, lang)}
            className={`group flex items-center justify-between rounded-card border ${s.accent} p-6 transition-colors hover:border-brand/60`}
          >
            <div>
              <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.description}</p>
            </div>
            <span className="shrink-0 font-display text-sm font-semibold text-brand">&rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
