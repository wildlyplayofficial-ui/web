import type { Metadata } from "next";
import Link from "next/link";
import {
  getActiveWatching,
  getSettledPicks,
  getTodaysNoPlays,
  getTodaysPicks,
  getTrackRecordForAuthor,
} from "@/lib/data";
import { formatBoardDate, formatUnits, locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { localizedCompetitionName } from "@/lib/competition-logos";
import { HomeNextMatches, type StripMatch } from "@/components/home-next-matches";
import { ScoreboardRail } from "@/components/scoreboard-rail";
import { HotPickCard } from "@/components/hot-pick-card";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import { AnalysisCard, analysisExcerpt } from "@/components/analysis-card";

export const revalidate = 300;

/** Ngoại hạng Anh trên Livescore — giải duy nhất có lịch tĩnh cả mùa. */
const EPL_LIVESCORE_ID = 2;

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
    description: dict.home.seoDescription,
    alternates: buildAlternates("/", lang),
    openGraph: {
      title: `WildlyPlay — ${dict.tagline}`,
      description: dict.home.seoDescription,
      images: [{ url: `/api/og/home?lang=${lang}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `WildlyPlay — ${dict.tagline}`,
      description: dict.home.seoDescription,
      images: [{ url: `/api/og/home?lang=${lang}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Home({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [allPicks, record, settledPicks, noPlays, watching, eplDays, competitions, articles] =
    await Promise.all([
      getTodaysPicks(),
      getTrackRecordForAuthor("curator"),
      getSettledPicks(),
      getTodaysNoPlays(),
      getActiveWatching(),
      getCompetitionFixtures(EPL_LIVESCORE_ID),
      getStandingsCompetitions(),
      getAnalysisArticles(undefined, 7),
    ]);

  const todayKey = new Date().toISOString().slice(0, 10);

  // Dải trận trang chủ gộp MỌI giải, không riêng Ngoại hạng Anh (Peter 8/8).
  // Lấy trận vừa đá xong (có tỉ số) rồi tới trận sắp đá — tháng 8 Ngoại hạng Anh
  // chưa lăn bóng nhưng MLS/Liga MX đang đá, trang chủ phải có cái để xem.
  const active = competitions.filter((c) => c.status === "active" && c.slug);
  const perComp = await Promise.all(
    active.map(async (c) => {
      const days = await getCompetitionFixtures(c.livescoreId).catch(() => []);
      return days.flatMap((d) =>
        d.matches.map(
          (m): StripMatch => ({
            ...m,
            compSlug: c.slug,
            compName: localizedCompetitionName(c.slug, c.shortName || c.name, lang),
          }),
        ),
      );
    }),
  );
  const allMatches = perComp.flat();
  const key = (m: StripMatch) => `${m.date}T${m.time || "00:00"}`;
  const vuaDa = allMatches
    .filter((m) => m.finished && m.date <= todayKey)
    .sort((a, b) => key(b).localeCompare(key(a)))
    .slice(0, 3)
    .reverse();
  // Ngoại hạng Anh luôn đứng trước (Peter 8/8) — đây là giải mình đặt nặng nhất.
  // Còn lại xếp theo giờ, tối đa 2 trận mỗi giải: xếp thuần theo giờ thì vòng
  // loại Cúp C1 chiếm gần hết dải, vẫn là "một giải" y như cũ chỉ khác tên.
  const chuaDa = allMatches
    .filter((x) => !x.finished && x.date >= todayKey)
    .sort((a, b) => key(a).localeCompare(key(b)));
  const uuTien = chuaDa.filter((m) => m.compSlug === "premier-league").slice(0, 3);
  const demTheoGiai = new Map<string, number>([["premier-league", uuTien.length]]);
  const sapDa: StripMatch[] = [...uuTien];
  for (const m of chuaDa) {
    const da = demTheoGiai.get(m.compSlug) ?? 0;
    if (da >= 2) continue;
    demTheoGiai.set(m.compSlug, da + 1);
    sapDa.push(m);
    if (sapDa.length >= 8) break;
  }
  const stripMatches = [...vuaDa, ...sapDa];

  const eplOpenDate = eplDays.length ? eplDays[0].date : null;
  const daysToOpen =
    eplOpenDate && eplOpenDate > todayKey
      ? Math.ceil((Date.parse(eplOpenDate + "T00:00:00Z") - Date.parse(todayKey + "T00:00:00Z")) / 86_400_000)
      : null;
  // §7.1: Home hero numbers are curator-only (never blend Scout results)
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");

  // Predictions slot — the top curator pick, or nothing. NEVER a fabricated seed:
  // no real pick = the card is omitted below (the old test-seed rendered a fake match).
  const heroPick = picks[0] ?? null;

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

  // Mùa nghỉ: bảng rỗng HẲN và đã biết ngày khai mạc. Chỉ rỗng thôi thì vẫn giữ
  // teaser cũ vì có thể là ngày trống giữa mùa, không phải trước khai mạc.
  const preseason =
    daysToOpen !== null && picks.length === 0 && noPlays.length === 0 && watching.length === 0;

  // Super Sunday: the marquee article headlines the page; the rest fill the feed.
  const hot = articles.find((a) => a.tier === "T2_marquee") ?? articles[0];
  const hotHero = hot ? hot.hero_image ?? `/api/og/analysis/${hot.slug}?locale=${lang}` : "";
  const hotExcerpt = hot ? hot.meta_description || analysisExcerpt(hot.body) : "";
  const restArticles = articles.filter((a) => a.slug !== hot?.slug).slice(0, 6);

  return (
    <>
      {/* Top scoreboard rail (ESPN strip) — reuses the same match data as HomeNextMatches. */}
      <ScoreboardRail
        matches={stripMatches}
        lang={lang}
        labels={{ title: dict.home.scoreboardTitle, finished: dict.matches.finished }}
      />
      <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      {/* Daily Board teaser — right under the scoreboard rail so the day's picks
          are the first thing after the fixtures strip (Nick 16/8). Preseason
          countdown when the board is empty, so the homepage doesn't read as
          broken with "0 · 0 · 0" between seasons. */}
      <section className="pb-10 pt-6">
        {preseason ? (
          <Link
            href={withLang("/competitions/premier-league/fixtures", lang)}
            className="group flex flex-wrap items-center justify-between gap-5 rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5 transition-colors hover:border-brand/60"
          >
            <div className="flex items-center gap-5">
              <div className="text-center leading-none">
                <div className="font-display text-4xl font-bold text-brand tabular-nums">
                  {daysToOpen}
                </div>
                <div className="mt-1 text-xs text-muted">{dict.home.daysLabel}</div>
              </div>
              <div>
                <p className="font-display text-lg font-bold">{dict.home.preseasonTitle}</p>
                <p className="mt-1 max-w-[46ch] text-sm text-muted">{dict.home.preseasonBody}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
              {dict.home.viewFixtures} &rarr;
            </span>
          </Link>
        ) : (
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
                <span className="mx-2">·</span>
                {dict.board.watchingLabel}: <strong className="text-ink">{watching.length}</strong>
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
              {dict.home.viewBoard} &rarr;
            </span>
          </Link>
        )}
      </section>

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
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
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
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        <div className="relative">
          <h1 className="hero-gradient-text mx-auto max-w-[700px] font-display text-2xl font-bold sm:text-4xl md:text-5xl">
            {dict.tagline}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">{dict.board.subtitle}</p>
          {record.settled > 0 && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-2 font-display text-sm">
              <span className="text-muted">{dict.pick.curator}</span>
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
                    prefetch={false}
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

      {/* 1b. Super Sunday: the single biggest thing after the hero. */}
      {hot && (
        <section className="pt-4 pb-10">
          <Link
            href={withLang(`/analysis/${hot.slug}`, lang)}
            prefetch={false}
            className="group grid overflow-hidden rounded-card border border-brand/40 bg-card shadow-raised transition-colors hover:border-brand/60 md:grid-cols-[1.1fr_1fr]"
          >
            <div
              className="relative min-h-[200px] bg-cover bg-center md:min-h-[280px]"
              style={{ backgroundImage: `url(${hotHero})`, aspectRatio: "1.9 / 1" }}
              aria-hidden
            >
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-bg">
                ★ {dict.home.superSunday}
              </span>
            </div>
            <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-brand">
                ◆ {dict.home.hotPick}
              </span>
              <h2 className="font-display text-2xl font-bold leading-tight transition-colors group-hover:text-brand md:text-3xl">
                {hot.title}
              </h2>
              <p className="text-sm text-muted">
                {hot.league}
                <span className="mx-2">·</span>
                {formatPostDate(hot.published_at, lang)}
              </p>
              {hotExcerpt && <p className="text-sm text-muted line-clamp-2">{hotExcerpt}</p>}
              <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
                {dict.home.viewAnalysisCta} &rarr;
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* 1c. Hot pick prediction — the top curator pick. Omitted when there is none
          (never a fabricated seed). */}
      {heroPick && (
        <section className="pb-10">
          <HotPickCard
            pick={heroPick}
            predicted={null}
            lang={lang}
            href={withLang("/daily-board", lang)}
            ctaLabel={dict.home.viewBoard}
          />
        </section>
      )}

      {/* 3. Two-column portal — main: latest analysis + matches; sidebar: record + Telegram */}
      <div className="grid gap-8 pb-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {restArticles.length > 0 && (
            <section className="pb-10">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold">{dict.home.latestAnalysis}</h2>
                <Link
                  href={withLang("/analysis", lang)}
                  prefetch={false}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  {dict.nav.analysis} &rarr;
                </Link>
              </div>
              <AnalysisCard article={restArticles[0]} lang={lang} variant="lead" />
              {restArticles.length > 1 && (
                <div className="mt-4 space-y-3">
                  {restArticles.slice(1).map((a) => (
                    <AnalysisCard key={a.slug} article={a} lang={lang} variant="list" />
                  ))}
                </div>
              )}
            </section>
          )}

          <HomeNextMatches
            matches={stripMatches}
            lang={lang}
            labels={{
              title: dict.home.matchesTitle,
              all: dict.home.allCompetitions,
              finished: dict.home.finished,
              noTime: dict.standings.provisionalTime,
            }}
          />
        </div>

        <aside className="space-y-6">
          {/* Track record */}
          <div className="rounded-card border border-line bg-card p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold">{dict.home.trackRecord}</h2>
              <Link
                href={withLang("/track-record", lang)}
                prefetch={false}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {dict.board.trackRecordCta} &rarr;
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-display text-xl font-bold tabular-nums">
                  {record.wins}-{record.losses}-{record.pushes}
                </div>
                <div className="mt-1 text-xs text-muted">W-D-L</div>
              </div>
              <div>
                <div
                  className={`font-display text-xl font-bold tabular-nums ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
                >
                  {formatUnits(record.units_pl)}
                </div>
                <div className="mt-1 text-xs text-muted">{dict.archive.unitsPl}</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold tabular-nums">
                  {record.settled > 0
                    ? `${Math.round((record.wins / record.settled) * 100)}%`
                    : "—"}
                </div>
                <div className="mt-1 text-xs text-muted">{dict.home.hitRate}</div>
              </div>
            </div>
            {form.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {form.map((p) => (
                  <Link
                    key={p.id}
                    href={withLang(`/play/${p.id}`, lang)}
                    prefetch={false}
                    title={`${p.home_team} ${p.home_score ?? ""}-${p.away_score ?? ""} ${p.away_team}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-xs font-bold transition-transform hover:-translate-y-0.5 ${formClass[p.status] ?? "border-line bg-card text-muted"}`}
                  >
                    {formLetter[p.status] ?? "–"}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Telegram CTA */}
          <div className="rounded-card border border-brand/30 bg-brand-dim/40 p-5">
            <h2 className="font-display text-lg font-bold">{dict.home.telegramTitle}</h2>
            <p className="mt-2 text-sm text-muted">{dict.home.telegramPitch}</p>
            <a
              href="https://t.me/wildlyplay"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 font-display text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
            >
              {dict.home.joinTelegram} &rarr;
            </a>
          </div>
        </aside>
      </div>

      {/* 4. Learn strip: calculators + guides */}
      <section className="grid gap-4 pb-10 sm:grid-cols-2">
        <Link
          href={withLang("/calculators", lang)}
          prefetch={false}
          className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-brand/30"
        >
          <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">
            {dict.nav.calculators} &rarr;
          </h2>
          <p className="mt-2 text-sm text-muted">{dict.calculators.subtitle}</p>
        </Link>
        <Link
          href={withLang("/guides", lang)}
          prefetch={false}
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
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.nav.about} &rarr;
            </Link>
            <Link
              href={withLang("/archive", lang)}
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.board.trackRecordCta} &rarr;
            </Link>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
