import type { Metadata } from "next";
import Link from "next/link";
import {
  getPosts,
  getSettledPicks,
  getTodaysNoPlays,
  getTodaysPicks,
  getTrackRecordForAuthor,
} from "@/lib/data";
import { formatBoardDate, formatUnits, locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

/** Units P/L over the 30 days before now (form widget, batch 4). */
function unitsLast30(picks: { settled_at: string | null; kickoff_utc: string; units_pl: number | null }[]): number {
  const cutoff = Date.now() - 30 * 86_400_000;
  const sum = picks
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff)
    .reduce((total, p) => total + (p.units_pl ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

function formatPostDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: { absolute: `WildlyPlay — ${dict.tagline}` },
    description: dict.board.subtitle,
    alternates: buildAlternates("/", lang),
    openGraph: {
      title: `WildlyPlay — ${dict.tagline}`,
      description: dict.board.subtitle,
      images: [{ url: "/og-home.png", width: 1200, height: 630 }],
    },
  };
}

export default async function Home({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [allPicks, record, settledPicks, noPlays, posts] = await Promise.all([
    getTodaysPicks(),
    getTrackRecordForAuthor("curator"),
    getSettledPicks(),
    getTodaysNoPlays(),
    getPosts(lang),
  ]);
  // §7.1: Home hero numbers are curator-only (never blend Scout results)
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");

  // Form widget (Nick 13/6: show all within last 30 days, swipeable, scroll to newest).
  const curatorSettled = settledPicks.filter((p) => (p.author ?? "curator") === "curator");
  const cutoff30 = Date.now() - 30 * 86_400_000;
  const form = curatorSettled
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff30)
    .reverse()
    .slice(-15);
  const units30 = unitsLast30(curatorSettled);
  const formLetter: Record<string, string> = { won: "W", lost: "L", push: "P" };
  const formClass: Record<string, string> = {
    won: "border-brand/30 bg-brand-dim text-brand",
    lost: "border-loss/30 bg-loss/10 text-loss",
    push: "border-line bg-card text-muted",
  };

  const latestPosts = posts.slice(0, 4);

  return (
    <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      {/* 1. Hero: brand positioning + curator record + form */}
      <section className="relative overflow-hidden py-16 text-center md:py-20">
        <div className="hero-glow" aria-hidden />
        {/* Mobile pitch (slice) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13] dark:opacity-[0.2] md:hidden" viewBox="0 0 1100 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect x="0" y="0" width="1100" height="400" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0f9e7a] dark:text-brand" />
          <line x1="550" y1="0" x2="550" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="3" fill="currentColor" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="-8" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1100" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        {/* Desktop pitch (meet) */}
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-[0.13] dark:opacity-[0.2] md:block" viewBox="0 0 1100 400" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <rect x="0" y="0" width="1100" height="400" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0f9e7a] dark:text-brand" />
          <line x1="550" y1="0" x2="550" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="3" fill="currentColor" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="-8" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1100" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        <div className="relative">
          <h1 className="hero-gradient-text mx-auto max-w-[700px] font-display text-2xl font-bold sm:text-4xl md:text-5xl">
            {dict.tagline}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">{dict.board.subtitle}</p>
          {record.settled > 0 && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-2 font-display text-sm">
              <span className="text-muted">The Curator</span>
              <span className="font-semibold text-ink">
                {record.wins}-{record.losses}-{record.pushes}
              </span>
              <span
                className={`font-semibold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
              >
                {formatUnits(record.units_pl)}
              </span>
              <span className="text-muted">
                · {dict.board.asOf} {formatBoardDate(new Date(), lang)}
              </span>
            </p>
          )}
          {form.length > 0 && (
            <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
              <span className="text-muted">{dict.board.formTitle}</span>
              <div className="flex flex-wrap justify-center gap-1.5 py-1">
                {form.map((p) => (
                  <Link
                    key={p.id}
                    href={withLang(`/play/${p.id}`, lang)}
                    title={`${p.home_team} ${p.home_score ?? ""}-${p.away_score ?? ""} ${p.away_team}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-xs font-bold transition-transform hover:-translate-y-0.5 ${formClass[p.status] ?? "border-line bg-card text-muted"}`}
                  >
                    {formLetter[p.status] ?? "\u2013"}
                  </Link>
                ))}
              </div>
              <span className="text-xs text-muted">
                {dict.board.last30}{" "}
                <strong className={units30 >= 0 ? "text-brand" : "text-loss"}>
                  {formatUnits(units30)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Daily Board teaser: today's summary + CTA */}
      <section className="pb-10">
        <Link
          href={withLang("/daily-board", lang)}
          className="group flex flex-wrap items-center justify-between gap-4 rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5 transition-colors hover:border-brand/60"
        >
          <div>
            <p className="font-display text-lg font-bold">{dict.board.title}</p>
            <p className="mt-1 text-sm text-muted">
              {formatBoardDate(new Date(), lang)}
              <span className="mx-2">·</span>
              {dict.board.picksLabel}: <strong className="text-ink">{picks.length}</strong>
              <span className="mx-2">·</span>
              {dict.board.noPlaysLabel}: <strong className="text-ink">{noPlays.length}</strong>
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
            {dict.home.viewBoard} &rarr;
          </span>
        </Link>
      </section>

      {/* 3. Latest analysis: newest published posts */}
      {latestPosts.length > 0 && (
        <section className="pb-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">{dict.home.latestAnalysis}</h2>
            <Link href={withLang("/news", lang)} className="text-sm font-semibold text-brand hover:underline">
              {dict.nav.analysis} &rarr;
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {latestPosts.map((post) => (
              <Link
                key={post.id}
                href={withLang(`/news/${post.slug}`, lang)}
                className="group rounded-card border border-line bg-card p-5 transition-colors hover:border-brand/30"
              >
                <time className="text-xs text-muted" dateTime={post.published_at ?? undefined}>
                  {formatPostDate(post.published_at, lang)}
                </time>
                <p className="mt-2 font-display text-base font-bold transition-colors group-hover:text-brand">
                  {post.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Learn strip: calculators + guides */}
      <section className="grid gap-4 pb-10 sm:grid-cols-2">
        <Link
          href={withLang("/calculators", lang)}
          className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-brand/30"
        >
          <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">
            {dict.nav.calculators} &rarr;
          </h2>
          <p className="mt-2 text-sm text-muted">{dict.calculators.subtitle}</p>
        </Link>
        <Link
          href={withLang("/guides", lang)}
          className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-brand/30"
        >
          <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">
            {dict.nav.guides} &rarr;
          </h2>
          <p className="mt-2 text-sm text-muted">{dict.guides.subtitle}</p>
        </Link>
      </section>

      {/* 5. Trust strip: §7.1 firewall stated in plain words + About */}
      <section className="pb-14">
        <div className="rounded-card border border-line bg-card px-6 py-6">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
              <span>{dict.home.trustCurator}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#6b9e9e]" aria-hidden />
              <span>{dict.home.trustScout}</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href={withLang("/about", lang)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.nav.about} &rarr;
            </Link>
            <Link
              href={withLang("/archive", lang)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.board.trackRecordCta} &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
