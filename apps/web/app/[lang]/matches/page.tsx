import type { Metadata } from "next";
import Link from "next/link";
import { getAllMatchSlugs } from "@/lib/data";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { MatchDateGroups } from "./match-date-groups";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.matches.allMatches,
    description: dict.matches.matchesSubtitle,
    openGraph: {
      title: `${dict.matches.allMatches} | WildlyPlay`,
      description: dict.matches.matchesSubtitle,
      images: [{ url: "/api/og/editorial?title=Today%27s%20Matches&subtitle=World%20Cup%202026%20fixtures%20and%20predictions", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/matches", lang),
  };
}

const SLUG_OVERRIDES: Record<string, string> = {
  usa: "USA", "dr-congo": "DR Congo", "congo-dr": "Congo DR",
  "bosnia-herzegovina": "Bosnia and Herzegovina", "bosnia-and-herzegovina": "Bosnia and Herzegovina",
  "cape-verde": "Cape Verde", "south-korea": "South Korea", "south-africa": "South Africa",
  "costa-rica": "Costa Rica", "czech-republic": "Czech Republic", "new-zealand": "New Zealand",
  "saudi-arabia": "Saudi Arabia", "ivory-coast": "Ivory Coast", "cote-d-ivoire": "Ivory Coast",
  "cura-ao": "Curacao", "c-te-d-ivoire": "Ivory Coast",
};

function deslugify(s: string): string {
  if (SLUG_OVERRIDES[s]) return SLUG_OVERRIDES[s];
  return s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function parseSlug(slug: string): { home: string; away: string; date: string } | null {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx < 0) return null;
  const home = slug.slice(0, vsIdx);
  const rest = slug.slice(vsIdx + 4);
  const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  const away = rest.slice(0, rest.length - date.length - 1);
  return home && away ? { home, away, date } : null;
}

const DEDUP_ALIASES: Record<string, string> = {
  turkiye: "turkey", "czech republic": "czechia", "korea republic": "south korea", "congo dr": "dr congo",
};

function dedupName(display: string): string {
  return DEDUP_ALIASES[display.toLowerCase()] ?? display.toLowerCase();
}


const PER_PAGE = 30;

export default async function MatchesIndex({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const leagueFilter = typeof sp.league === "string" ? sp.league : undefined;
  const dict = getDict(lang);
  const allSlugs = await getAllMatchSlugs();

  const parsed = allSlugs
    .map((entry) => {
      const p = parseSlug(entry.slug);
      if (!p) return null;
      return { ...entry, ...p };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // Dedup same matchup ±1 day
  const seen = new Set<string>();
  const deduped = parsed.filter((m) => {
    const home = dedupName(deslugify(m.home));
    const away = dedupName(deslugify(m.away));
    const teamKey = [home, away].sort().join("|");
    const key = teamKey + "|" + m.date;
    if (seen.has(key)) return false;
    const d = new Date(m.date + "T00:00:00Z");
    const prev = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    const next = new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
    if (seen.has(teamKey + "|" + prev) || seen.has(teamKey + "|" + next)) return false;
    seen.add(key);
    return true;
  });

  // Normalize league names: strip group/round suffixes + unify WC variants
  const normalizeLeague = (l: string): string => {
    let n = l.replace(/\s*[—–-]\s*(Group\s+\w+(\s*\(MD\d\))?|Round of \d+|Quarter-final|Semi-final|Final|Group Stage(\s*\(MD\d\))?)$/i, "").trim();
    // Unify all World Cup variants to one canonical name
    if (/^(FIFA\s+)?World\s+Cup(\s+2026)?$/i.test(n)) n = "FIFA World Cup 2026";
    return n;
  };

  const leagueMap = new Map<string, string>(); // normalized → first raw
  for (const m of deduped) {
    if (!m.league) continue;
    const norm = normalizeLeague(m.league);
    if (!leagueMap.has(norm)) leagueMap.set(norm, norm);
  }
  const leagues = [...leagueMap.keys()].sort();

  // Filter by league (match against normalized name)
  const filtered = leagueFilter ? deduped.filter((m) => normalizeLeague(m.league) === leagueFilter) : deduped;

  // Sort: upcoming first (kickoff ASC), then settled (kickoff DESC)
  const now = new Date().toISOString();
  const upcoming = filtered.filter((m) => m.kickoffUtc >= now).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const settled = filtered.filter((m) => m.kickoffUtc < now).sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc));
  const matches = [...upcoming, ...settled];

  const totalPages = Math.ceil(matches.length / PER_PAGE);
  const pageMatches = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Prepare serializable match entries for client-side local-date grouping
  const matchEntries = pageMatches.map((m) => ({
    slug: m.slug,
    kickoffUtc: m.kickoffUtc,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    pickStatus: m.pickStatus,
    liveStatus: m.liveStatus,
    minute: m.minute,
    league: normalizeLeague(m.league),
    homeName: deslugify(m.home),
    awayName: deslugify(m.away),
  }));

  function leagueHref(league: string | undefined): string {
    const qs = league ? `?league=${encodeURIComponent(league)}` : "";
    return withLang(`/matches${qs}`, lang);
  }

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Matches", url: "/matches" }]} />
      <section className="py-12 text-center">
        <div className="flex items-center justify-center gap-4">
          <img
            src="/icons/icon-192x192.png"
            alt=""
            aria-hidden="true"
            className="h-16 w-16 flex-shrink-0 object-contain"
          />
          <h1 className="gradient-text font-display text-4xl font-bold">{dict.matches.allMatches}</h1>
        </div>
        <p className="mt-3 text-muted">{dict.matches.matchesSubtitle}</p>
      </section>

      {/* Competition chips */}
      {leagues.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter by competition">
          <Link
            href={leagueHref(undefined)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${!leagueFilter ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
          >
            All
          </Link>
          {leagues.map((l) => (
            <Link
              key={l}
              href={leagueHref(leagueFilter === l ? undefined : l)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${leagueFilter === l ? "border-brand/40 bg-brand-dim text-brand" : "border-line bg-card text-muted hover:text-ink"}`}
            >
              {l}
            </Link>
          ))}
        </nav>
      )}

      {matchEntries.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">{dict.matches.empty}</div>
      ) : (
        <MatchDateGroups matches={matchEntries} lang={lang} />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 pb-8 pt-4">
          {page > 1 && (
            <Link
              href={withLang(`/matches?page=${page - 1}${leagueFilter ? `&league=${encodeURIComponent(leagueFilter)}` : ""}`, lang)}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              &larr; Prev
            </Link>
          )}
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={withLang(`/matches?page=${page + 1}${leagueFilter ? `&league=${encodeURIComponent(leagueFilter)}` : ""}`, lang)}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              Next &rarr;
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
