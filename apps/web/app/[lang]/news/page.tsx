import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getNewsItems, getHeadline, type NewsItem } from "@/lib/news";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { LocalDate } from "@/components/local-date";
import { locales } from "@/lib/format";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TYPE_LABELS: Record<string, string> = {
  preview: "Preview",
  result: "Result",
  standings: "Standings",
  transfer: "Transfer",
  general: "News",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  preview: "border-blue-400/40 text-blue-400",
  result: "border-emerald-400/40 text-emerald-400",
  standings: "border-amber-400/40 text-amber-400",
  transfer: "border-indigo-soft/40 text-indigo-soft",
  general: "border-muted/40 text-muted",
};

function resolveLeague(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.news.title,
    description: dict.news.subtitle,
    openGraph: {
      title: `${dict.news.title} | WildlyPlay`,
      description: dict.news.subtitle,
      images: [{ url: "/api/og/editorial?title=News&subtitle=Match%20news%20and%20updates", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/news", lang),
  };
}

/** TZ-agnostic relative label; null when older than 7 days (caller falls back to LocalDate). */
function relativeTime(iso: string): string | null {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return null;
}

function NewsCard({ item, lang, leagueLabels }: { item: NewsItem; lang: Lang; leagueLabels: Record<string, string> }) {
  const headline = getHeadline(item, lang);
  const typeLabel = TYPE_LABELS[item.type] ?? "News";
  const badgeColor = TYPE_BADGE_COLORS[item.type] ?? TYPE_BADGE_COLORS.general;
  const relative = relativeTime(item.published_at);

  return (
    <Link
      href={withLang(`/news/${item.slug}`, lang)}
      className="group rounded-card border border-line bg-card shadow-card transition-colors hover:border-line-hover hover:bg-card-hover p-5"
    >
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className={`rounded-full border px-2 py-0.5 font-display font-semibold ${badgeColor}`}>
          {typeLabel}
        </span>
        {item.competition_id && (
          <span className="text-muted/70">
            {leagueLabels[item.competition_id] ?? item.competition_id}
          </span>
        )}
        {relative ? (
          <time dateTime={item.published_at} className="ml-auto shrink-0">
            {relative}
          </time>
        ) : (
          <LocalDate
            iso={item.published_at}
            locale={locales[lang]}
            format="short"
            className="ml-auto shrink-0"
          />
        )}
      </div>
      <h2 className="mt-3 font-display text-lg font-bold transition-colors group-hover:text-brand">
        {headline}
      </h2>
    </Link>
  );
}

export default async function NewsLanding({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const league = resolveLeague(sp.league);
  const dict = getDict(lang);
  const [items, competitions] = await Promise.all([
    getNewsItems(league, 30),
    getStandingsCompetitions(),
  ]);
  // Chips mirror the active competition scope — same source as /competitions hub,
  // so filter ids always match news_items.competition_id (FK -> competitions.id).
  const leagueFilters = competitions
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, label: c.name }));
  const leagueLabels = Object.fromEntries(leagueFilters.map((f) => [f.id, f.label]));

  return (
    <div className="mx-auto max-w-[800px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.news.title, url: "/news" }]} />

      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

      {/* League Filter Chips */}
      <nav className="mb-6 flex flex-wrap gap-2">
        <Link
          href={withLang("/news", lang)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            !league
              ? "bg-brand text-white"
              : "border border-line bg-card text-muted hover:border-line-hover hover:text-foreground"
          }`}
        >
          All
        </Link>
        {leagueFilters.map((f) => (
          <Link
            key={f.id}
            href={withLang(`/news?league=${f.id}`, lang)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              league === f.id
                ? "bg-brand text-white"
                : "border border-line bg-card text-muted hover:border-line-hover hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {/* News Feed */}
      {items.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.news.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} lang={lang} leagueLabels={leagueLabels} />
          ))}
        </div>
      )}
    </div>
  );
}
