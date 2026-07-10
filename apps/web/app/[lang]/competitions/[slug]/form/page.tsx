import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { fetchCompetitionTable } from "@/lib/standings";
import { getCompetitionForm, getStandingsCompetitions } from "@/lib/standings-extra";
import { teamBadge } from "@/lib/team-badges";
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
  const title = `${comp.name} — Form Guide`;
  return {
    title,
    alternates: buildAlternates(`/competitions/${slug}/form`, lang),
    openGraph: { title: `${title} | WildlyPlay` },
  };
}

const FORM_COLORS: Record<string, string> = {
  W: "bg-brand text-bg",
  D: "bg-muted/20 text-muted",
  L: "bg-loss/10 text-loss",
};

export default async function FormPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const comp = await resolveCompetition(slug);
  if (!comp) notFound();
  const flagKey = `standings_${slug.replace(/-/g, "_")}`;
  const flagEnabled = await isFeatureEnabled(flagKey);
  if (comp.status !== "active" && !flagEnabled) notFound();

  const [tableRows, formMap] = await Promise.all([
    fetchCompetitionTable(comp.livescoreId),
    getCompetitionForm(comp.livescoreId),
  ]);

  const rows = tableRows
    .map((r) => ({ ...r, form: r.form || formMap[r.name] || "" }))
    .filter((r) => r.form)
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.standings.title, url: "/competitions" }, { name: comp.name, url: `/competitions/${slug}` }, { name: "Form", url: `/competitions/${slug}/form` }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{comp.name}</h1>
        <p className="mt-2 text-muted">Form Guide — Last 5 Matches</p>
      </section>

      {/* Tabs */}
      <nav className="mb-8 flex justify-center gap-2">
        <Link href={withLang(`/competitions/${slug}`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          Standings
        </Link>
        <Link href={withLang(`/competitions/${slug}/fixtures`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          Fixtures
        </Link>
        <span className="rounded-full border border-brand/40 bg-brand-dim px-4 py-1.5 text-sm font-semibold text-brand">
          Form
        </span>
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">No form data available.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-4 rounded-card border border-line bg-card p-4">
              <span className="w-8 text-center font-display text-sm font-bold text-muted">{r.rank}</span>
              {teamBadge(r.name) ? (
                <img src={teamBadge(r.name)!} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
              ) : (
                <span className="h-6 w-6 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate font-display text-sm font-bold">{r.name}</span>
              <div className="flex gap-1">
                {r.form.split("").map((ch, i) => (
                  <span
                    key={i}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${FORM_COLORS[ch] ?? "bg-card text-muted"}`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
