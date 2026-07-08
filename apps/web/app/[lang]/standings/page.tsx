import type { Metadata } from "next";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { getStandings, getEplStandings } from "@/lib/standings";
import { getKnockoutRounds, getStandingsCompetitions } from "@/lib/standings-extra";
import { GroupTableWithTabs } from "@/components/standings-tabs";
import { LeagueTable } from "@/components/standings-league";
import { KnockoutBracket, MatchCard } from "@/components/knockout-bracket";
import { CompetitionSwitcher } from "@/components/competition-switcher";
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
    title: dict.standings.title,
    description: dict.standings.subtitle,
    openGraph: {
      title: `${dict.standings.title} | WildlyPlay`,
      description: dict.standings.subtitle,
      images: [{ url: "/og-home.png", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/standings", lang),
  };
}

export default async function StandingsPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const eplEnabled = await isFeatureEnabled("epl_standings");
  const [standings, eplStandings, knockoutRounds, competitions] = await Promise.all([
    getStandings(),
    eplEnabled ? getEplStandings() : Promise.resolve([]),
    getKnockoutRounds(362),
    getStandingsCompetitions(),
  ]);

  // Switcher lets users hop to Liga MX / MLS etc. Index page IS the World Cup,
  // so its selected slug is the active WC competition (livescoreId 362).
  const activeComps = competitions
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  const wcSlug = competitions.find((c) => c.livescoreId === 362)?.slug ?? "";

  if (standings.length === 0 && knockoutRounds.length === 0) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 pb-12">
        <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Standings", url: "/standings" }]} />
        <section className="py-12 text-center">
          <h1 className="gradient-text font-display text-4xl font-bold">{dict.standings.title}</h1>
          <p className="mt-3 text-muted">{dict.standings.subtitle}</p>
        </section>
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      </div>
    );
  }

  const thirdTeams = standings.filter((g) => g.group.toLowerCase().includes("3rd"));
  const groups = standings.filter((g) => !g.group.toLowerCase().includes("3rd"));

  // Same split as /standings/[slug]: bracket first with rounds still in
  // play/upcoming; fully finished rounds drop below the group tables.
  const isRoundFinished = (r: (typeof knockoutRounds)[number]) =>
    r.matches.every((m) => m.finished);
  const hasActiveRound = knockoutRounds.some((r) => !isRoundFinished(r));
  const archivedRounds = hasActiveRound ? knockoutRounds.filter(isRoundFinished) : [];
  const activeRounds = hasActiveRound
    ? knockoutRounds.filter((r) => !isRoundFinished(r))
    : knockoutRounds;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Standings", url: "/standings" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.standings.title}</h1>
        <p className="mt-3 text-muted">{dict.standings.subtitle}</p>
      </section>

      <CompetitionSwitcher
        competitions={activeComps}
        currentSlug={wcSlug}
        lang={lang}
        label={dict.standings.title}
      />

      {/* Bracket first, same as /standings/[slug] (Nick 3/7) */}
      <KnockoutBracket
        rounds={activeRounds}
        knockoutLabel={dict.standings.knockout}
      />

      {groups.length > 0 && (
        <div className={`grid gap-6 md:grid-cols-2${activeRounds.length > 0 ? " mt-12" : ""}`}>
          {groups.map((g) => (
            <GroupTableWithTabs
              key={g.group}
              group={g.group}
              teams={g.teams}
              labels={dict.standings}
            />
          ))}
        </div>
      )}

      {thirdTeams.length > 0 && (
        <div className="mt-8">
          {thirdTeams.map((g) => (
            <GroupTableWithTabs
              key={g.group}
              group={g.group}
              teams={g.teams}
              labels={dict.standings}
            />
          ))}
        </div>
      )}

      {archivedRounds.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">
            {dict.standings.knockoutFinished}
          </h2>
          {archivedRounds.map((r) => (
            <div key={r.round} className="mt-6 first:mt-0">
              <h3 className="mb-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-muted">
                {r.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {r.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {eplStandings.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-center font-display text-2xl font-bold">
            Premier League
          </h2>
          <LeagueTable teams={eplStandings} labels={dict.standings} />
        </section>
      )}
    </div>
  );
}
