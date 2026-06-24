import type { Metadata } from "next";
import { teamFlag } from "@/lib/flags";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { getStandings, type GroupStanding } from "@/lib/standings";

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

function GroupTable({ standing, dict }: {
  standing: GroupStanding;
  dict: ReturnType<typeof getDict>;
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold">
        {dict.standings.group} {standing.group}
      </h2>
      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="px-2 py-2 font-medium">{dict.standings.team}</th>
              <th className="px-1.5 py-2 text-center font-medium">{dict.standings.mp}</th>
              <th className="px-1.5 py-2 text-center font-medium">{dict.standings.w}</th>
              <th className="px-1.5 py-2 text-center font-medium">{dict.standings.d}</th>
              <th className="px-1.5 py-2 text-center font-medium">{dict.standings.l}</th>
              <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{dict.standings.gf}</th>
              <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{dict.standings.ga}</th>
              <th className="px-1.5 py-2 text-center font-medium">{dict.standings.gd}</th>
              <th className="px-2 py-2 text-center font-semibold">{dict.standings.pts}</th>
            </tr>
          </thead>
          <tbody>
            {standing.teams.map((team, i) => {
              const qualify = i < 2;
              const bestThird = i === 2;
              const borderClass = qualify
                ? "border-l-2 border-l-brand"
                : bestThird
                  ? "border-l-2 border-l-line"
                  : "";
              return (
                <tr
                  key={team.name}
                  className={`border-b border-line last:border-0 ${borderClass}`}
                >
                  <td className="px-2 py-2 text-center text-muted">{team.rank}</td>
                  <td className="px-2 py-2 font-medium text-ink">
                    <span className="mr-1.5">{teamFlag(team.name)}</span>
                    {team.name}
                  </td>
                  <td className="px-1.5 py-2 text-center text-muted">{team.played}</td>
                  <td className="px-1.5 py-2 text-center text-muted">{team.won}</td>
                  <td className="px-1.5 py-2 text-center text-muted">{team.drawn}</td>
                  <td className="px-1.5 py-2 text-center text-muted">{team.lost}</td>
                  <td className="hidden px-1.5 py-2 text-center text-muted sm:table-cell">{team.goals_for}</td>
                  <td className="hidden px-1.5 py-2 text-center text-muted sm:table-cell">{team.goals_against}</td>
                  <td className="px-1.5 py-2 text-center text-ink">
                    {team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}
                  </td>
                  <td className="px-2 py-2 text-center font-display font-bold text-ink">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function StandingsPage({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const standings = await getStandings();

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
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
                <GroupTable key={g.group} standing={g} dict={dict} />
              ))}
            </div>
            {thirdTeams.length > 0 && (
              <div className="mt-8">
                {thirdTeams.map((g) => (
                  <GroupTable key={g.group} standing={g} dict={dict} />
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
