import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/data";
import { fetchCompetitionTable } from "@/lib/standings";
import { getCompetitionFixtures, getCompetitionForm, getKnockoutRounds, getStandingsCompetitions } from "@/lib/standings-extra";
import { GroupTableWithTabs } from "@/components/standings-tabs";
import { LeagueTable } from "@/components/standings-league";
import { KnockoutBracket, MatchCard } from "@/components/knockout-bracket";
import { LeagueFixtures } from "@/components/league-fixtures";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { COMPETITION_LOGOS } from "@/lib/competition-logos";

export const revalidate = 3600;

/** League palette for competition OG cards (spec §1: hubs use league colors). */
const LEAGUE_COLORS: Record<string, string> = {
  "world-cup-2026": "#56042c",
  mls: "#1b2a4a",
  "liga-mx": "#1a472a",
  "premier-league": "#3d195b",
  bundesliga: "#d3010d",
  "la-liga": "#ee8707",
  "ligue-1": "#091c3e",
  "serie-a": "#1a439a",
  "champions-league": "#0e1e3d",
};

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

// Prerender active competition slugs at build so the first visit is instant
// (ISR keeps them fresh via `revalidate`). Feature-flagged/inactive slugs stay
// on-demand — `dynamicParams` is left at its default (true) for this segment.
export async function generateStaticParams() {
  const competitions = await getStandingsCompetitions();
  return competitions
    .filter((c) => c.status === "active" && c.slug)
    .map((c) => ({ slug: c.slug }));
}

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
    alternates: buildAlternates(`/competitions/${slug}`, lang),
    openGraph: {
      title: `${title} | WildlyPlay`,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(comp.name)}&subtitle=Standings%2C%20fixtures%2C%20and%20predictions&color=${encodeURIComponent(LEAGUE_COLORS[slug] ?? "")}`, width: 1200, height: 630 }],
    },
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

  // The Champions League / Europa League / Relegation legend only applies to the
  // top-5 European leagues. MLS/Liga MX (and anything else) use playoffs, not
  // European cups, so their table renders without that misleading legend.
  const EURO_LEAGUES = new Set(["premier-league", "la-liga", "serie-a", "bundesliga", "ligue-1"]);
  const showQualification = EURO_LEAGUES.has(slug);

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
          { name: dict.standings.title, url: "/competitions" },
          { name: comp.name, url: `/competitions/${slug}` },
        ]}
      />
      <section className="py-12 text-center">
        <div className="flex items-center justify-center gap-4">
          {COMPETITION_LOGOS[slug] && (
            <img
              src={COMPETITION_LOGOS[slug]}
              alt=""
              aria-hidden="true"
              className="h-16 w-16 flex-shrink-0 object-contain"
            />
          )}
          <h1 className="gradient-text font-display text-4xl font-bold">{comp.name}</h1>
        </div>
        {comp.season && (
          <p className="mt-3 text-muted">
            {dict.standings.seasonNote.replace("{season}", comp.season)}
          </p>
        )}
      </section>

      {/* Tabs — hidden for WC (single page with bracket + groups) */}
      {!isWorldCup && (
        <nav className="mb-8 flex justify-center gap-2">
          <span className="rounded-full border border-brand/40 bg-brand-dim px-4 py-1.5 text-sm font-semibold text-brand">
            Standings
          </span>
          <Link href={withLang(`/competitions/${slug}/fixtures`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
            Fixtures
          </Link>
          <Link href={withLang(`/competitions/${slug}/form`, lang)} className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
            Form
          </Link>
        </nav>
      )}

      {rows.length === 0 && knockoutRounds.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      ) : isWorldCup ? (
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
        /* Multi-group non-WC (e.g. MLS conferences) — standings only, fixtures in /fixtures tab */
        <>
          <div className="space-y-8">
            {[...groupMap.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, teams]) => (
                <section key={group}>
                  {group && (
                    <h2 className="mb-3 font-display text-lg font-bold">{group}</h2>
                  )}
                  <LeagueTable teams={teams.sort((a, b) => a.rank - b.rank)} labels={dict.standings} showQualification={showQualification} />
                </section>
              ))}
          </div>
        </>
      ) : (
        /* Single flat table (EPL, La Liga, etc.) — standings only, fixtures in /fixtures tab */
        <LeagueTable teams={sortedRows} labels={dict.standings} showQualification={showQualification} />
      )}
    </div>
  );
}
