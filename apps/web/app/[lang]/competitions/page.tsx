import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 3600;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.standings.title,
    description: dict.standings.subtitle,
    openGraph: {
      title: `${dict.standings.title} | WildlyPlay`,
      description: dict.standings.subtitle,
      images: [{ url: "/api/og/editorial?title=Competitions&subtitle=Standings%2C%20fixtures%2C%20and%20predictions%20by%20league", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/competitions", lang),
  };
}

const COMP_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  "world-cup-2026": { border: "border-brand/40", bg: "bg-brand-dim/30", text: "text-brand" },
  mls: { border: "border-blue-400/40", bg: "bg-blue-400/10", text: "text-blue-400" },
  "liga-mx": { border: "border-emerald-400/40", bg: "bg-emerald-400/10", text: "text-emerald-400" },
};

const DEFAULT_COLORS = { border: "border-line", bg: "bg-card", text: "text-muted" };

export default async function CompetitionsHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const competitions = await getStandingsCompetitions();
  const active = competitions.filter((c) => c.status === "active" && c.slug);

  return (
    <div className="mx-auto max-w-[800px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.standings.title, url: "/competitions" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.standings.title}</h1>
        <p className="mt-3 text-muted">{dict.standings.subtitle}</p>
      </section>

      {active.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((comp) => {
            const colors = COMP_COLORS[comp.slug] ?? DEFAULT_COLORS;
            return (
              <Link
                key={comp.id}
                href={withLang(`/competitions/${comp.slug}`, lang)}
                className={`group flex items-center justify-between rounded-card border ${colors.border} ${colors.bg} p-6 transition-colors hover:border-brand/60`}
              >
                <div>
                  <h2 className="font-display text-xl font-bold transition-colors group-hover:text-brand">
                    {comp.name}
                  </h2>
                  {comp.season && (
                    <p className="mt-1 text-sm text-muted">{comp.season}</p>
                  )}
                </div>
                <span className={`shrink-0 font-display text-sm font-semibold ${colors.text}`}>
                  {dict.nav.standings} &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
