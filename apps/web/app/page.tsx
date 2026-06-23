import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailyLineStrip } from "@/components/daily-line-strip";
import { LiveCommentaryStrip } from "@/components/live-commentary-strip";
import { MatchesWidget } from "@/components/matches-widget";
import { PickCard } from "@/components/pick-card";
import { WatchingTeaser } from "@/components/watching-teaser";
import {
  buildMatchSlug,
  getActiveWatching,
  getSettledPicks,
  getThesisTranslations,
  getTodaysPicks,
  getTrackRecord,
  getVoteCounts,
} from "@/lib/data";
import { formatBoardDate, formatUnits } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";

export const revalidate = 300;

/** Units P/L over the 30 days before now (form widget, batch 4). */
function unitsLast30(picks: { settled_at: string | null; kickoff_utc: string; units_pl: number | null }[]): number {
  const cutoff = Date.now() - 30 * 86_400_000;
  const sum = picks
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff)
    .reduce((total, p) => total + (p.units_pl ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  return {
    title: { absolute: `WildlyPlay — ${dict.tagline}` },
    description: dict.tagline,
    alternates: buildAlternates("/", lang),
    openGraph: { title: `${dict.board.title} | WildlyPlay`, description: dict.tagline, images: [{ url: "/og-home.png", width: 1200, height: 630 }] },
  };
}

export default async function DailyBoard({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const [picks, record, settledPicks, watching] = await Promise.all([
    getTodaysPicks(),
    getTrackRecord(),
    getSettledPicks(),
    getActiveWatching(),
  ]);
  const [votes, translations] = await Promise.all([
    getVoteCounts(picks.map((p) => p.id)), // crowd poll (decision #5)
    getThesisTranslations(picks.map((p) => p.id)), // thesis in the visitor's language
  ]);

  // Form widget (Nick 13/6: show all within last 30 days, swipeable, scroll to newest).
  const cutoff30 = Date.now() - 30 * 86_400_000;
  const form = settledPicks
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff30)
    .reverse(); // oldest → newest (scroll right = recent)
  const units30 = unitsLast30(settledPicks);
  const formLetter: Record<string, string> = { won: "W", lost: "L", push: "P" };
  const formClass: Record<string, string> = {
    won: "border-brand/30 bg-brand-dim text-brand",
    lost: "border-loss/30 bg-loss/10 text-loss",
    push: "border-line bg-card text-muted",
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      <section className="relative overflow-hidden py-16 text-center md:py-20">
        <div className="hero-glow" aria-hidden />
        {/* Pitch line-art V1 — football field lines behind hero */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13] dark:opacity-[0.2]" viewBox="0 0 1100 400" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <line x1="550" y1="0" x2="550" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="3" fill="currentColor" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          {/* Goal posts — small rectangles at goal line */}
          <rect x="-8" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          {/* Penalty arc (D) */}
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          {/* Right goal posts */}
          <rect x="1100" y="170" width="8" height="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          {/* Right penalty arc */}
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        <div className="relative">
          <h1 className="hero-gradient-text mx-auto max-w-[700px] font-display text-2xl font-bold sm:text-4xl md:text-5xl">
            {dict.tagline}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">{dict.board.subtitle}</p>
          {record.settled > 0 && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-2 font-display text-sm">
              <span className="text-muted">{dict.archive.record}</span>
              <span className="font-semibold text-ink">
                {record.wins}-{record.losses}-{record.pushes}
              </span>
              <span
                className={`font-semibold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
              >
                {formatUnits(record.units_pl)}
              </span>
            </p>
          )}
          {form.length > 0 && (
            <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
              <span className="text-muted">{dict.board.formTitle}</span>
              <div
                className="flex max-w-[min(100vw-40px,500px)] flex-wrap justify-center gap-1.5 py-1"
              >
                {form.map((p) => (
                  <Link
                    key={p.id}
                    href={withLang(`/play/${p.id}`, lang)}
                    title={`${p.home_team} ${p.home_score ?? ""}-${p.away_score ?? ""} ${p.away_team}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-xs font-bold transition-transform hover:-translate-y-0.5 ${formClass[p.status] ?? "border-line bg-card text-muted"}`}
                  >
                    {formLetter[p.status] ?? "–"}
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

      {/* DL2: Always-on Daily Line strip — below form, above Daily Board */}
      <Suspense fallback={null}>
        <DailyLineStrip lang={lang} />
      </Suspense>

      {/* Live commentary snippet — only shows when a picked match is live */}
      <LiveCommentaryStrip
        pickMatchSlugs={Object.fromEntries(
          picks.map((p) => [
            `${p.home_team}|${p.away_team}`,
            buildMatchSlug(p.home_team, p.away_team, p.kickoff_utc),
          ]),
        )}
      />

      <section className="pb-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{dict.board.title}</h2>
          <p className="text-sm text-muted">{formatBoardDate(new Date(), lang)}</p>
        </div>

        {picks.length === 0 ? (
          <div className="rounded-card border border-line bg-card px-6 py-16 text-center">
            <p className="font-display text-2xl font-bold">{dict.board.emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-[480px] text-muted">{dict.board.emptyBody}</p>
            <a
              href="https://t.me/wildlyplay"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,230,118,0.3)]"
            >
              Telegram →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {picks.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                lang={lang}
                votes={votes[pick.id]}
                thesisText={translations[pick.id]?.[lang] ?? pick.thesis}
              />
            ))}
          </div>
        )}
      </section>

      <WatchingTeaser items={watching} lang={lang} />

      <MatchesWidget lang={lang} />
    </div>
  );
}
