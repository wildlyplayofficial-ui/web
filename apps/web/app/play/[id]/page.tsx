import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrowdPoll } from "@/components/crowd-poll";
import { ShareBar } from "@/components/share-bar";
import { LiveClock } from "@/components/live-clock";
import { StatusBadge } from "@/components/status-badge";
import { TeamLogo } from "@/components/team-logo";
import { getPick, getPost, getThesisTranslations, getVoteCounts } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { badgeFor, formatKickoff, formatOdds, formatUnits, marketLabels } from "@/lib/format";
import { getDict, resolveLang, withLang } from "@/lib/i18n";

/**
 * Play detail page — one pick, everything public (decisions #1, #3: full
 * transparency). Shows the full thesis and, once settled, the real AH math
 * (raw_outcome + units P/L) next to the W/L badge, like the archive does.
 */

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
  const pick = await getPick(id);
  if (!pick) return { title: "Not found" };
  const title = `${pick.home_team} vs ${pick.away_team} — ${pick.selection}`;
  const translations = await getThesisTranslations([pick.id]);
  const description = (translations[pick.id]?.[lang] ?? pick.thesis).slice(0, 160);
  const image = `/api/og/play/${id}`;
  return {
    title,
    description,
    openGraph: { title: `${title} | WildlyPlay`, description, images: [image] },
    twitter: {
      card: "summary_large_image",
      title: `${title} | WildlyPlay`,
      description,
      images: [image],
    },
  };
}

export default async function PlayDetail({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
  const dict = getDict(lang);
  const pick = await getPick(id);
  if (!pick) notFound();

  // Votes, translations, and recap in parallel (Nick 14/6: optimize TTFB).
  const settled = pick.units_pl !== null;
  const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const recapSlug = settled
    ? `recap-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.home_score}-${pick.away_score}`
    : null;
  const [voteCounts, translations, recap] = await Promise.all([
    getVoteCounts([pick.id]),
    getThesisTranslations([pick.id]),
    recapSlug ? getPost(recapSlug, lang) : Promise.resolve(null),
  ]);
  // Fallback: old picks used recap-{uuid} slugs
  const recapFinal = recap ?? (settled ? await getPost(`recap-${pick.id}`, lang) : null);
  const votes = voteCounts[pick.id];
  const thesisText = translations[pick.id]?.[lang] ?? pick.thesis;
  const totalVotes = votes.follow + votes.fade + votes.skip;
  const homeFlag = teamFlag(pick.home_team);
  const awayFlag = teamFlag(pick.away_team);
  // CLV: how the published price compares to the closing price (same selection + line).
  const clv = pick.odds_close !== null ? (pick.odds_publish / pick.odds_close - 1) * 100 : null;

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <Link href={withLang("/", lang)} className="text-sm text-muted transition-colors hover:text-brand">
        ← {dict.play.backToBoard}
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {pick.league} · {formatKickoff(pick.kickoff_utc, lang)}
          </p>
          <div className="flex items-center gap-2">
            <StatusBadge kind={badgeFor(pick)} dict={dict} />
            {badgeFor(pick) === "live" && pick.fixture_id > 0 && (
              <LiveClock eventId={String(pick.fixture_id)} showScore />
            )}
          </div>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
          {pick.home_id != null && (
            <span className="mr-2 inline-flex items-center align-middle">
              <TeamLogo participantId={pick.home_id} team={pick.home_team} size={28} />
            </span>
          )}
          {homeFlag && <span className="mr-1.5">{homeFlag}</span>}
          {pick.home_team} <span className="text-muted">vs</span>{" "}
          {pick.away_id != null && (
            <span className="mr-2 inline-flex items-center align-middle">
              <TeamLogo participantId={pick.away_id} team={pick.away_team} size={28} />
            </span>
          )}
          {awayFlag && <span className="mr-1.5">{awayFlag}</span>}
          {pick.away_team}
        </h1>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="rounded-md border border-brand/30 bg-brand-dim px-2.5 py-1 font-display font-semibold text-brand">
          {pick.selection}
        </span>
        <span className="text-muted">
          {dict.play.market} <strong className="text-ink">{marketLabels[pick.market]}</strong>
          {pick.line !== null && (
            <>
              {" · "}
              {dict.play.line} <strong className="text-ink">{pick.line}</strong>
            </>
          )}
          {" · "}
          {dict.pick.odds} <strong className="text-ink">{formatOdds(pick.odds_publish)}</strong>
          {" · "}
          {dict.pick.stake} <strong className="text-ink">{pick.stake_units}u</strong>
          {pick.odds_close !== null && clv !== null && (
            <>
              {" · "}
              {dict.play.closing} <strong className="text-ink">{formatOdds(pick.odds_close)}</strong>{" "}
              <strong className={clv > 0 ? "text-brand" : clv < 0 ? "text-loss" : "text-muted"}>
                CLV {clv > 0 ? "+" : clv < 0 ? "−" : ""}
                {Math.abs(clv).toFixed(1)}%
              </strong>
            </>
          )}
        </span>
        {/* In-play pick marker — AH settles on final − publish score (batch 2). */}
        {pick.publish_score_home !== null && pick.publish_score_away !== null && (
          <span className="rounded-md border border-line bg-card px-2.5 py-1 text-muted">
            {dict.play.pickedAt}{" "}
            <strong className="text-ink">
              {pick.publish_score_home}–{pick.publish_score_away}
            </strong>
          </span>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-indigo-soft">
          {dict.play.thesis} — {dict.pick.curator}
        </h2>
        <blockquote className="mt-3 border-l-2 border-indigo-soft/60 pl-4 leading-relaxed text-ink/90">
          {thesisText}
        </blockquote>
      </section>

      {settled && pick.raw_outcome !== null && pick.units_pl !== null && (
        <section className="mt-8 rounded-card border border-line bg-card p-6">
          <h2 className="font-display text-lg font-bold">{dict.play.result}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
            <p className="font-display text-2xl font-bold">
              {dict.pick.finalScore} {pick.home_score}–{pick.away_score}
            </p>
            <p className="text-sm text-muted">
              {dict.play.rawOutcome}:{" "}
              <strong className="text-ink">{dict.outcome[pick.raw_outcome]}</strong>
            </p>
            <p
              className={`font-display text-xl font-bold ${
                pick.units_pl > 0 ? "text-brand" : pick.units_pl < 0 ? "text-loss" : "text-muted"
              }`}
            >
              {formatUnits(pick.units_pl)}
            </p>
          </div>
          {/* Real AH math note, same rule as the archive (decision #2). */}
          <p className="mt-4 text-xs text-muted">{dict.archive.unitsNote}</p>
          {pick.odds_close !== null && <p className="mt-1 text-xs text-muted">{dict.play.clvNote}</p>}
        </section>
      )}

      {recapFinal && (
        <p className="mt-6">
          <Link
            href={withLang(`/news/${recapFinal.slug}`, lang)}
            className="font-display text-sm font-semibold text-brand transition-colors hover:text-ink"
          >
            {dict.play.readRecap} →
          </Link>
        </p>
      )}

      {pick.status === "published" ? (
        <CrowdPoll pickId={pick.id} lang={lang} initial={votes} />
      ) : (
        totalVotes > 0 && (
          <section className="mt-8 rounded-card border border-line bg-card p-6">
            <h2 className="font-display text-lg font-bold">{dict.crowd.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {(["follow", "fade", "skip"] as const).map((kind) => (
                <span key={kind} className="text-muted">
                  {dict.poll[kind]}{" "}
                  <strong className="text-ink">
                    {Math.round((votes[kind] / totalVotes) * 100)}%
                  </strong>
                </span>
              ))}
            </div>
            {pick.status === "won" && pick.units_pl !== null && pick.stake_units > 0 && (
              <p className="mt-3 text-sm font-semibold text-brand">
                {dict.crowd.followersWon.replace(
                  "{units}",
                  formatUnits(pick.units_pl / pick.stake_units),
                )}
              </p>
            )}
            {pick.status === "lost" && (
              <p className="mt-3 text-sm font-semibold text-loss">{dict.crowd.followersLost}</p>
            )}
          </section>
        )
      )}

      <ShareBar lang={lang} text={`${pick.home_team} vs ${pick.away_team} — ${pick.selection} | WildlyPlay`} />

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
