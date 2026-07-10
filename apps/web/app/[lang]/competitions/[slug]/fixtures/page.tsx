import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { LeagueFixtures } from "@/components/league-fixtures";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 600;

type Props = { params: Promise<{ lang: string; slug: string }> };

async function resolveCompetition(slug: string) {
  const competitions = await getStandingsCompetitions();
  return competitions.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const comp = await resolveCompetition(slug);
  if (!comp) return { title: dict.standings.title };
  const title = `${comp.name} — Fixtures`;
  return {
    title,
    alternates: buildAlternates(`/competitions/${slug}/fixtures`, lang),
    openGraph: { title: `${title} | WildlyPlay` },
  };
}

export default async function FixturesPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const comp = await resolveCompetition(slug);
  if (!comp) notFound();
  const flagKey = `standings_${slug.replace(/-/g, "_")}`;
  const flagEnabled = await isFeatureEnabled(flagKey);
  if (comp.status !== "active" && !flagEnabled) notFound();

  const fixtureDays = await getCompetitionFixtures(comp.livescoreId);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.standings.title, url: "/competitions" }, { name: comp.name, url: `/competitions/${slug}` }, { name: "Fixtures", url: `/competitions/${slug}/fixtures` }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{comp.name}</h1>
        <p className="mt-2 text-muted">Fixtures</p>
      </section>

      {/* Tabs */}
      <nav className="mb-8 flex justify-center gap-2">
        <Link href={withLang(`/competitions/${slug}`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          Standings
        </Link>
        <span className="rounded-full border border-brand/40 bg-brand-dim px-4 py-1.5 text-sm font-semibold text-brand">
          Fixtures
        </span>
        <Link href={withLang(`/competitions/${slug}/form`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          Form
        </Link>
      </nav>

      {fixtureDays.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">No fixtures available.</div>
      ) : (
        <LeagueFixtures days={fixtureDays} label="Fixtures" />
      )}
    </div>
  );
}
