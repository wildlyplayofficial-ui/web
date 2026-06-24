import type { Metadata } from "next";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { getStandings, getEplStandings } from "@/lib/standings";
import { GroupTableWithTabs } from "@/components/standings-tabs";
import { LeagueTable } from "@/components/standings-league";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 600;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
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

export default async function StandingsPage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const eplEnabled = await isFeatureEnabled("epl_standings");
  const [standings, eplStandings] = await Promise.all([
    getStandings(),
    eplEnabled ? getEplStandings() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Standings",url:"/standings"}]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.standings.title}</h1>
        <p className="mt-3 text-muted">{dict.standings.subtitle}</p>
      </section>

      {standings.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      ) : (() => {
        const thirdTeams = standings.filter((g) => g.group.toLowerCase().includes("3rd"));
        const groups = standings.filter((g) => !g.group.toLowerCase().includes("3rd"));
        return (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map((g) => (
                <GroupTableWithTabs
                  key={g.group}
                  group={g.group}
                  teams={g.teams}
                  labels={dict.standings}
                />
              ))}
            </div>
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
          </>
        );
      })()}

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
