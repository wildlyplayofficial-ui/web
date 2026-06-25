import type { Metadata } from "next";
import Link from "next/link";
import { getAllMatchSlugs, type MatchListEntry } from "@/lib/data";
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
      images: [{ url: "/og-home.png", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/matches", lang),
  };
}

/** Parse "home-vs-away-yyyy-mm-dd" into displayable parts. */
function parseSlug(slug: string): { home: string; away: string; date: string } | null {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx < 0) return null;
  const home = slug.slice(0, vsIdx);
  const rest = slug.slice(vsIdx + 4);
  const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  const away = rest.slice(0, rest.length - date.length - 1);
  if (!home || !away) return null;
  return { home, away, date };
}

const SLUG_OVERRIDES: Record<string, string> = {
  usa: "USA",
  "dr-congo": "DR Congo",
  "congo-dr": "Congo DR",
  "bosnia-herzegovina": "Bosnia and Herzegovina",
  "bosnia-and-herzegovina": "Bosnia and Herzegovina",
  "cape-verde": "Cape Verde",
  "south-korea": "South Korea",
  "south-africa": "South Africa",
  "costa-rica": "Costa Rica",
  "czech-republic": "Czech Republic",
  "new-zealand": "New Zealand",
  "saudi-arabia": "Saudi Arabia",
};

function deslugify(s: string): string {
  if (SLUG_OVERRIDES[s]) return SLUG_OVERRIDES[s];
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const DEDUP_ALIASES: Record<string, string> = {
  turkiye: "turkey",
  "czech republic": "czechia",
  "korea republic": "south korea",
  "congo dr": "dr congo",
};

function dedupName(display: string): string {
  const lower = display.toLowerCase();
  return DEDUP_ALIASES[lower] ?? lower;
}

function formatMatchDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso + "T00:00:00Z"));
}

const PER_PAGE = 20;

export default async function MatchesIndex({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const dict = getDict(lang);
  const allSlugs = await getAllMatchSlugs();

  const parsed = allSlugs
    .map((entry) => {
      const p = parseSlug(entry.slug);
      if (!p) return null;
      return { ...entry, ...p };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc));

  const seen = new Set<string>();
  const matches = parsed.filter((m) => {
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

  const totalPages = Math.ceil(matches.length / PER_PAGE);
  const pageMatches = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Matches",url:"/matches"}]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">
          {dict.matches.allMatches}
        </h1>
        <p className="mt-3 text-muted">{dict.matches.matchesSubtitle}</p>
      </section>

      {pageMatches.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.matches.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {pageMatches.map((m) => {
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
                <MatchStatus kickoffUtc={m.kickoffUtc} liveStatus={m.liveStatus} minute={m.minute} />
                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                    <span className="text-base">
                      {hf && <span className="mr-1.5">{hf}</span>}
                      {homeName}
                    </span>
                    {showScore && m.homeScore !== null && (
                      <span className="text-base tabular-nums">{m.homeScore}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                    <span className="text-base">
                      {af && <span className="mr-1.5">{af}</span>}
                      {awayName}
                    </span>
                    {showScore && m.awayScore !== null && (
                      <span className="text-base tabular-nums">{m.awayScore}</span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <time dateTime={m.date} className="text-xs text-muted">
                    {formatMatchDate(m.date, lang)}
                  </time>
                  {m.pickStatus === "won" && (
                    <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Won</span>
                  )}
                  {m.pickStatus === "lost" && (
                    <span className="rounded-md bg-loss/10 px-2 py-0.5 text-xs font-semibold text-loss">Lost</span>
                  )}
                  {m.pickStatus === "push" && (
                    <span className="rounded-md bg-muted/10 px-2 py-0.5 text-xs font-semibold text-muted">Push</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 pb-8 pt-4">
          {page > 1 && (
            <Link
              href={withLang(`/matches${page > 2 ? `?page=${page - 1}` : ""}`, lang)}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              &larr; Prev
            </Link>
          )}
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={withLang(`/matches?page=${page + 1}`, lang)}
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
