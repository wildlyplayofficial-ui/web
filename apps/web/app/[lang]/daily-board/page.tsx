import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailyLineStrip } from "@/components/daily-line-strip";
import { LiveCommentaryStrip } from "@/components/live-commentary-strip";
import { MatchesWidget } from "@/components/matches-widget";
import { PickCard } from "@/components/pick-card";
import { WatchingTeaser } from "@/components/watching-teaser";
import { teamFlag } from "@/lib/flags";
import {
  buildMatchSlug,
  getActiveWatching,
  getSettledPicks,
  getThesisTranslations,
  getTodaysNoPlays,
  getTodaysPicks,
  getTrackRecordForAuthor,
  getVoteCounts,
} from "@/lib/data";
import { formatBoardDate, formatUnits } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.board.title} | WildlyPlay`,
    description: dict.board.subtitle,
    alternates: buildAlternates("/daily-board", lang),
    openGraph: {
      title: `${dict.board.title} | WildlyPlay`,
      description: dict.board.subtitle,
      images: [{ url: "/og-home.png", width: 1200, height: 630 }],
    },
  };
}

export default async function DailyBoard({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [allPicks, settledPicks, watching, noPlays, scoutRecord] = await Promise.all([
    getTodaysPicks(),
    getSettledPicks(),
    getActiveWatching(),
    getTodaysNoPlays(),
    getTrackRecordForAuthor("scout"),
  ]);
  // §7.1: split picks by author — curator picks go to the board, scout picks to the Scout section
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  const scoutPicks = allPicks.filter((p) => p.author === "scout");
  const [votes, translations] = await Promise.all([
    getVoteCounts(allPicks.map((p) => p.id)),
    getThesisTranslations(allPicks.map((p) => p.id)),
  ]);

  // Today's results: picks settled today (UTC) — closes the transparency loop.
  const today = new Date().toISOString().slice(0, 10);
  const todaysResults = settledPicks.filter((p) => (p.settled_at ?? "").startsWith(today));
  const resultLetter: Record<string, string> = { won: "W", lost: "L", push: "P" };
  const resultClass: Record<string, string> = {
    won: "border-brand/30 bg-brand-dim text-brand",
    lost: "border-loss/30 bg-loss/10 text-loss",
    push: "border-line bg-card text-muted",
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      {/* 1. Header: title + date-stamp + one-line summary */}
      <section className="pt-10 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-3xl font-bold">{dict.board.title}</h1>
          <p className="text-sm text-muted">{formatBoardDate(new Date(), lang)}</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          {dict.board.picksLabel}: <strong className="text-ink">{picks.length}</strong>
          <span className="mx-2">·</span>
          {dict.board.noPlaysLabel}: <strong className="text-ink">{noPlays.length}</strong>
          <span className="mx-2">·</span>
          {dict.board.watchingLabel}: <strong className="text-ink">{watching.length}</strong>
        </p>
      </section>

      {/* Daily Line strip */}
      <Suspense fallback={null}>
        <DailyLineStrip lang={lang} />
      </Suspense>

      {/* Live commentary snippet */}
      <LiveCommentaryStrip
        pickMatchSlugs={Object.fromEntries(
          picks.map((p) => [
            `${p.home_team}|${p.away_team}`,
            buildMatchSlug(p.home_team, p.away_team, p.kickoff_utc),
          ]),
        )}
      />

      {/* 2. Curator picks (kickoff-ordered) or the honest no-play state */}
      <section className="pb-8">
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
              Telegram &rarr;
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

      {/* 3. No-plays today — the discipline moat as a real list, not just a count */}
      {noPlays.length > 0 && (
        <section className="pb-8">
          <h2 className="font-display text-xl font-bold">{dict.board.noPlaysTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.board.noPlaysBody}</p>
          <div className="mt-4 flex flex-col gap-3">
            {noPlays.map((w) => (
              <Link
                key={w.id}
                href={withLang(`/match/${buildMatchSlug(w.home_team, w.away_team, w.kickoff_utc)}`, lang)}
                className="rounded-card border border-line bg-card p-4 transition-colors hover:border-brand/30"
              >
                <p className="font-display text-base font-bold">
                  {teamFlag(w.home_team) && <span className="mr-1">{teamFlag(w.home_team)}</span>}
                  {w.home_team}
                  <span className="mx-2 text-muted">vs</span>
                  {teamFlag(w.away_team) && <span className="mr-1">{teamFlag(w.away_team)}</span>}
                  {w.away_team}
                  <span className="ml-2 text-sm font-normal text-muted">{w.league}</span>
                </p>
                {(w.close_note ?? w.note_translations?.[lang] ?? w.note) && (
                  <p className="mt-1 text-sm italic text-muted">
                    {w.close_note ?? w.note_translations?.[lang] ?? w.note}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. §7.1 Scout section — hidden when scout has 0 settled picks (pre-launch rule) */}
      {scoutRecord.settled > 0 && (
        <section className="mb-8 rounded-card border border-dashed border-[#6b9e9e]/40 bg-[#6b9e9e]/[.04] px-5 py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-[#6b9e9e]">
              {dict.scout.heading} 🤖
            </h2>
            <span className="rounded-full border border-[#6b9e9e]/30 bg-[#6b9e9e]/10 px-3 py-0.5 font-display text-[0.7rem] font-semibold uppercase tracking-wide text-[#6b9e9e]">
              {dict.scout.badge}
            </span>
          </div>

          <p className="inline-flex items-center gap-2 rounded-full border border-[#6b9e9e]/30 bg-[#6b9e9e]/10 px-3.5 py-1 font-display text-xs">
            <span className="text-muted">The Scout</span>
            <span className="font-semibold text-ink">
              {scoutRecord.wins}-{scoutRecord.losses}-{scoutRecord.pushes}
            </span>
            <span className={`font-semibold ${scoutRecord.units_pl >= 0 ? "text-brand" : "text-loss"}`}>
              {formatUnits(scoutRecord.units_pl)}
            </span>
            <span className="text-muted">· {dict.board.asOf} {formatBoardDate(new Date(), lang)}</span>
          </p>

          {scoutPicks.length > 0 ? (
            <div className="mt-5 flex flex-col gap-5">
              {scoutPicks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  lang={lang}
                  votes={votes[pick.id]}
                  thesisText={translations[pick.id]?.[lang] ?? pick.thesis}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">{dict.scout.noPlay}</p>
          )}

          <p className="mt-5 text-xs text-muted">
            {dict.scout.disclosure}
          </p>
        </section>
      )}

      {/* 5. Watching — pipeline is active */}
      {watching.length > 0 && (
        <h2 className="mb-3 font-display text-xl font-bold">{dict.board.watchingTitle}</h2>
      )}
      <WatchingTeaser items={watching} lang={lang} />

      {/* 6. Today's results — closes the transparency loop. §7.1: each row carries its author label. */}
      {todaysResults.length > 0 && (
        <section className="pb-8">
          <h2 className="font-display text-xl font-bold">{dict.board.resultsTitle}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {todaysResults.map((p) => (
              <Link
                key={p.id}
                href={withLang(`/play/${p.id}`, lang)}
                className="flex items-center gap-3 rounded-card border border-line bg-card p-4 transition-colors hover:border-brand/30"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-sm font-bold ${resultClass[p.status] ?? "border-line bg-card text-muted"}`}
                >
                  {resultLetter[p.status] ?? "\u2013"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold">
                    {p.home_team} {p.home_score ?? ""}&ndash;{p.away_score ?? ""} {p.away_team}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {p.selection} · {(p.author ?? "curator") === "scout" ? "The Scout" : "The Curator"}
                  </span>
                </span>
                <span className={`shrink-0 font-display text-sm font-semibold ${(p.units_pl ?? 0) >= 0 ? "text-brand" : "text-loss"}`}>
                  {formatUnits(p.units_pl ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. Today's matches, time-ordered */}
      <MatchesWidget lang={lang} />

      {/* 8. Footer: Track Record CTA + Telegram */}
      <section className="flex flex-wrap items-center justify-center gap-4 pb-14 pt-4">
        <Link
          href={withLang("/archive", lang)}
          className="inline-flex items-center gap-2 rounded-full border border-brand px-7 py-3 font-display font-semibold text-brand transition-transform hover:-translate-y-0.5"
        >
          {dict.board.trackRecordCta} &rarr;
        </Link>
        <a
          href="https://t.me/wildlyplay"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,230,118,0.3)]"
        >
          Telegram &rarr;
        </a>
      </section>
    </div>
  );
}
