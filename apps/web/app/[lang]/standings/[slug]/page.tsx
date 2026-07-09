import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { fetchCompetitionTable } from "@/lib/standings";
import { getCompetitionFixtures, getCompetitionForm, getKnockoutRounds, getStandingsCompetitions } from "@/lib/standings-extra";
import { GroupTableWithTabs } from "@/components/standings-tabs";
import { LeagueTable } from "@/components/standings-league";
import { KnockoutBracket, MatchCard } from "@/components/knockout-bracket";
import { LeagueFixtures } from "@/components/league-fixtures";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 600;

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

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

  const title = dict.standings.titleFor.replace("{name}", comp.name);
  return {
    title,
    alternates: buildAlternates(`/standings/${slug}`, lang),
  };
}

export default async function StandingSlugPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);

  const comp = await resolveCompetition(slug);
  if (!comp) notFound();

  // Visibility: active OR feature flag standings_<slug_underscored>
  const flagKey = `standings_${slug.replace(/-/g, "_")}`;
  const flagEnabled = await isFeatureEnabled(flagKey);
  if (comp.status !== "active" && !flagEnabled) notFound();

  // P1: knockout bracket is WC-only. TODO(P3): replace this magic-number check
  // with a `format` column on competitions ("groups_knockout" | "league" |
  // "league_playoff") when MLS/Liga MX playoff brackets land.
  const isWorldCup = comp.livescoreId === 362;

  const [tableRows, knockoutRounds, fixtureDays, formMap] = await Promise.all([
    fetchCompetitionTable(comp.livescoreId),
    isWorldCup ? getKnockoutRounds(comp.livescoreId) : Promise.resolve([]),
    // League schedule-by-date: non-WC competitions only (WC uses the bracket).
    isWorldCup ? Promise.resolve([]) : getCompetitionFixtures(comp.livescoreId),
    // livescore's table has no form for leagues — derive it from results.
    isWorldCup ? Promise.resolve<Record<string, string>>({}) : getCompetitionForm(comp.livescoreId),
  ]);

  // Backfill the empty API form with the computed last-5 results.
  const rows = tableRows.map((r) => (r.form ? r : { ...r, form: formMap[r.name] ?? "" }));

  // Group by groupName when multiple distinct values exist
  const distinctGroups = new Set(rows.map((r) => r.groupName).filter(Boolean));
  const hasGroups = distinctGroups.size > 1;

  const groupMap = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.groupName || "";
    const list = groupMap.get(key) ?? [];
    list.push(row);
    groupMap.set(key, list);
  }

  const sortedRows = rows.slice().sort((a, b) => a.rank - b.rank);

  // Fully finished rounds drop below the group tables (Nick's request 3/7)
  // so the bracket up top only shows rounds still in play/upcoming. Keep
  // everything up top while no round is active (e.g. tournament over).
  const isRoundFinished = (r: (typeof knockoutRounds)[number]) =>
    r.matches.every((m) => m.finished);
  const hasActiveRound = knockoutRounds.some((r) => !isRoundFinished(r));
  const archivedRounds = hasActiveRound ? knockoutRounds.filter(isRoundFinished) : [];
  const activeRounds = hasActiveRound
    ? knockoutRounds.filter((r) => !isRoundFinished(r))
    : knockoutRounds;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.standings.title, url: "/standings" },
          { name: comp.name, url: `/standings/${slug}` },
        ]}
      />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{comp.name}</h1>
        {comp.season && (
          <p className="mt-3 text-muted">
            {dict.standings.seasonNote.replace("{season}", comp.season)}
          </p>
        )}
      </section>

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      ) : isWorldCup && hasGroups ? (
        <>
          {/* Knockout bracket first (Nick's request 2/7): during knockout phase
              it's the content users come for; group tables are reference. */}
          <KnockoutBracket rounds={activeRounds} knockoutLabel={dict.standings.knockout} />
          {/* WC groups layout: filter out 3rd teams aggregate */}
          {(() => {
            const thirdTeams = [...groupMap.entries()].filter(([g]) =>
              g.toLowerCase().includes("3rd"),
            );
            const groups = [...groupMap.entries()].filter(
              ([g]) => !g.toLowerCase().includes("3rd"),
            );
            return (
              <>
                {/* mt-12 only when the bracket rendered above (it has no bottom margin) */}
                <div className={`grid gap-6 md:grid-cols-2${knockoutRounds.length > 0 ? " mt-12" : ""}`}>
                  {groups
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([group, teams]) => (
                      <GroupTableWithTabs
                        key={group}
                        group={group}
                        teams={teams.sort((a, b) => a.rank - b.rank)}
                        labels={dict.standings}
                      />
                    ))}
                </div>
                {thirdTeams.length > 0 && (
                  <div className="mt-8">
                    {thirdTeams.map(([group, teams]) => (
                      <GroupTableWithTabs
                        key={group}
                        group={group}
                        teams={teams.sort((a, b) => a.rank - b.rank)}
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
              </>
            );
          })()}
        </>
      ) : hasGroups ? (
        /* Multi-group non-WC (e.g. MLS conferences) */
        <>
          {/* Schedule first (Nick 7/8): upcoming fixtures are more timely than
              the table, so they sit above it. */}
          <LeagueFixtures days={fixtureDays} label={dict.standings.schedule} />
          <div className="mt-12 space-y-8">
            {[...groupMap.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, teams]) => (
                <section key={group}>
                  {group && (
                    <h2 className="mb-3 font-display text-lg font-bold">{group}</h2>
                  )}
                  <LeagueTable teams={teams.sort((a, b) => a.rank - b.rank)} labels={dict.standings} />
                </section>
              ))}
          </div>
        </>
      ) : (
        /* Single flat table (EPL, La Liga, etc.) */
        <>
          <LeagueFixtures days={fixtureDays} label={dict.standings.schedule} />
          <div className="mt-12">
            <LeagueTable teams={sortedRows} labels={dict.standings} />
          </div>
        </>
      )}
    </div>
  );
}
