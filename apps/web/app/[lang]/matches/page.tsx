import type { Metadata } from "next";
import Link from "next/link";
import { getAllMatchSlugs } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { MatchStatus } from "./match-status";
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

function formatDateHeader(iso: string, lang: Lang): string {
  const d = new Date(iso + "T00:00:00Z");
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return lang === "vi" ? "Hôm nay" : lang === "th" ? "วันนี้" : lang === "es" ? "Hoy" : "Today";
  if (iso === tomorrow) return lang === "vi" ? "Ngày mai" : lang === "th" ? "พรุ่งนี้" : lang === "es" ? "Mañana" : "Tomorrow";
  return new Intl.DateTimeFormat(locales[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
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

  // Group by date for headers
  const dateGroups: { date: string; matches: typeof pageMatches }[] = [];
  for (const m of pageMatches) {
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.date === m.date) {
      last.matches.push(m);
    } else {
      dateGroups.push({ date: m.date, matches: [m] });
    }
  }

  function leagueHref(league: string | undefined): string {
    const qs = league ? `?league=${encodeURIComponent(league)}` : "";
    return withLang(`/matches${qs}`, lang);
  }

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Matches", url: "/matches" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.matches.allMatches}</h1>
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

      {pageMatches.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">{dict.matches.empty}</div>
      ) : (
        <div className="flex flex-col gap-6 pb-4">
          {dateGroups.map((group) => (
            <div key={group.date}>
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
                {formatDateHeader(group.date, lang)}
              </h2>
              <div className="flex flex-col gap-2">
                {group.matches.map((m) => {
                  const homeName = deslugify(m.home);
                  const awayName = deslugify(m.away);
                  const hf = teamFlag(homeName);
                  const af = teamFlag(awayName);
                  const showScore = m.liveStatus === "ft" || m.liveStatus === "live";
                  return (
                    <Link
                      key={m.slug}
                      href={withLang(`/match/${m.slug}`, lang)}
                      className="group rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
                    >
                      <div className="flex items-center justify-between">
                        <MatchStatus kickoffUtc={m.kickoffUtc} liveStatus={m.liveStatus} minute={m.minute} />
                        {m.league && (
                          <span className="rounded-full border border-line px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted">
                            {normalizeLeague(m.league)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                          <span className="text-base">{hf && <span className="mr-1.5">{hf}</span>}{homeName}</span>
                          {showScore && m.homeScore !== null && <span className="text-base tabular-nums">{m.homeScore}</span>}
                        </div>
                        <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                          <span className="text-base">{af && <span className="mr-1.5">{af}</span>}{awayName}</span>
                          {showScore && m.awayScore !== null && <span className="text-base tabular-nums">{m.awayScore}</span>}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-end">
                        {m.pickStatus === "won" && <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Won</span>}
                        {m.pickStatus === "lost" && <span className="rounded-md bg-loss/10 px-2 py-0.5 text-xs font-semibold text-loss">Lost</span>}
                        {m.pickStatus === "push" && <span className="rounded-md bg-muted/10 px-2 py-0.5 text-xs font-semibold text-muted">Push</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
