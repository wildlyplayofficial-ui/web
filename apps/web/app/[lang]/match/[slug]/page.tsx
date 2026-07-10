import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BoothSection } from "@/components/booth-section";
import { MatchCommentary } from "@/components/match-commentary";
import { PickCard } from "@/components/pick-card";
import { WatchingTeaser } from "@/components/watching-teaser";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { getBoothForPick } from "@/lib/booth-data";
import { getMatchBySlug, getThesisTranslations, getVoteCounts, SLUG_ALIASES } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { formatKickoff } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import type { MatchData } from "@/lib/types";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const match = await getMatchBySlug(slug);
  if (!match) return { title: "Not found" };

  const title = `${match.homeTeam} vs ${match.awayTeam} \u2014 Preview, Pick & Result`;
  const description = `${match.homeTeam} vs ${match.awayTeam} \u2014 ${match.league}. Expert prediction, odds analysis, and match result on WildlyPlay.`;
  const ogImage = `/api/og/match/${slug}`;

  return {
    title,
    description,
    openGraph: { title: `${title} | WildlyPlay`, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${title} | WildlyPlay`, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    alternates: buildAlternates(`/match/${slug}`, lang),
  };
}

function buildSportsEventSchema(match: MatchData) {
  return {
    "@context": "https://schema.org", "@type": "SportsEvent",
    name: `${match.homeTeam} vs ${match.awayTeam}`, startDate: match.kickoffUtc,
    location: { "@type": "Place", name: match.league || "Football" },
    competitor: [{ "@type": "SportsTeam", name: match.homeTeam }, { "@type": "SportsTeam", name: match.awayTeam }],
    organizer: { "@type": "Organization", name: "WildlyPlay", url: BASE },
  };
}

function canonicalSlug(slug: string): string | null {
  let changed = false; let out = slug;
  for (const [alias, canonical] of Object.entries(SLUG_ALIASES)) {
    if (out.includes(alias)) { out = out.replace(alias, canonical); changed = true; }
  }
  return changed ? out : null;
}

export default async function MatchPage({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const canonical = canonicalSlug(slug);
  if (canonical) permanentRedirect(`/match/${canonical}`);
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const match = await getMatchBySlug(slug);

  if (!match) {
    const vsIdx = slug.indexOf("-vs-");
    if (vsIdx < 0) notFound();
    const homePart = slug.slice(0, vsIdx);
    const rest = slug.slice(vsIdx + 4);
    const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})$/);
    if (!dateMatch) notFound();
    const datePart = dateMatch[1];
    const awayPart = rest.slice(0, rest.length - datePart.length - 1);
    const deslug = (s: string) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const homeName = deslug(homePart); const awayName = deslug(awayPart);
    const hf = teamFlag(homeName); const af = teamFlag(awayName);
    return (
      <article className="mx-auto max-w-[720px] px-5 py-12">
        <Link href={withLang("/", lang)} className="text-sm text-muted transition-colors hover:text-brand">&larr; {dict.match.backToMatches}</Link>
        <header className="mt-6">
          <p className="text-sm text-muted">{formatKickoff(datePart + "T00:00:00Z", lang)}</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            {hf && <span className="mr-1.5">{hf}</span>}{homeName}<span className="mx-2 text-muted">vs</span>{af && <span className="mr-1.5">{af}</span>}{awayName}
          </h1>
        </header>
        <div className="mt-8 rounded-card border border-line bg-card px-6 py-12 text-center"><p className="text-muted">{dict.match.noContent}</p></div>
      </article>
    );
  }

  const pickIds = match.picks.map((p) => p.id);
  const [votes, translations, boothEntries] = await Promise.all([
    getVoteCounts(pickIds),
    getThesisTranslations(pickIds),
    // Same Booth as /play so both URLs carry the same match content (Nick 3/7)
    match.picks.length > 0 ? getBoothForPick(match.picks[0].id) : Promise.resolve([]),
  ]);
  const homeFlag = teamFlag(match.homeTeam); const awayFlag = teamFlag(match.awayTeam);
  const schema = JSON.stringify(buildSportsEventSchema(match)).replace(/</g, "\\u003c");

  const postsBySlug = new Map<string, (typeof match.posts)[number]>();
  for (const post of match.posts) {
    const existing = postsBySlug.get(post.slug);
    if (!existing || (post.lang === lang && existing.lang !== lang)) {
      if (post.lang === lang || post.lang === "en") postsBySlug.set(post.slug, post);
    }
  }
  const postmortemArticle = [...postsBySlug.values()].find((p) => p.type === "post-mortem");
  const uniquePosts = [...postsBySlug.values()].filter((p) => p.type !== "post-mortem");

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.nav.matches, url: "/matches" }, { name: `${match.homeTeam} vs ${match.awayTeam}`, url: `/match/${slug}` }]} />
      <Link href={withLang("/", lang)} className="text-sm text-muted transition-colors hover:text-brand">&larr; {dict.match.backToMatches}</Link>

      <header className="mt-6">
        <p className="text-sm text-muted">{match.league}{match.league ? " \u00b7 " : ""}{formatKickoff(match.kickoffUtc, lang)}</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
          {homeFlag && <span className="mr-1.5">{homeFlag}</span>}{match.homeTeam}<span className="mx-2 text-muted">vs</span>{awayFlag && <span className="mr-1.5">{awayFlag}</span>}{match.awayTeam}
        </h1>
        {match.picks.some((p) => p.home_score !== null) && (() => {
          const pick = match.picks.find((p) => p.home_score !== null)!;
          const isSettled = ["won", "lost", "push"].includes(pick.status);
          return (<div className="mt-3 flex items-center gap-3">
            <span className="font-display text-2xl font-bold text-ink">{pick.home_score}&ndash;{pick.away_score}</span>
            {isSettled && (<span className={`rounded-md px-2 py-0.5 text-xs font-bold ${pick.status === "won" ? "bg-brand/10 text-brand" : pick.status === "lost" ? "bg-loss/10 text-loss" : "bg-muted/10 text-muted"}`}>{pick.status.toUpperCase()}{pick.units_pl !== null && ` ${pick.units_pl > 0 ? "+" : ""}${pick.units_pl}u`}</span>)}
            {pick.odds_close !== null && (<span className="text-xs text-muted">CLV: {pick.odds_publish} &rarr; {pick.odds_close}</span>)}
          </div>);
        })()}
      </header>

      {match.picks.length > 0 && (<section className="mt-8"><h2 className={match.picks[0].author === "scout" ? "mb-3 font-display text-lg font-bold text-scout" : "mb-3 font-display text-lg font-bold"}>{match.picks[0].author === "scout" ? dict.match.scoutPick : dict.match.curatorPick}</h2><div className="flex flex-col gap-4">{match.picks.map((pick) => (<PickCard key={pick.id} pick={pick} lang={lang} votes={votes[pick.id]} thesisText={translations[pick.id]?.[lang] ?? pick.thesis} hideLinks />))}</div></section>)}

      {match.picks.length > 0 && match.picks[0].fixture_id > 0 && (<MatchCommentary fixtureId={match.picks[0].fixture_id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} pick={match.picks[0]} lang={lang} />)}

      <BoothSection entries={boothEntries} lang={lang} />

      {match.picks.length > 0 && ["won", "lost", "push"].includes(match.picks[0].status) && (
        <section className="mt-6 rounded-card border border-line bg-card p-4 shadow-card">
          <h3 className="text-xs font-medium tracking-wider text-muted uppercase">Post-match review</h3>
          {postmortemArticle ? (<><p className="mt-2 text-sm text-ink">{postmortemArticle.meta_description}</p>{match.picks[0].status === "lost" && (match.picks[0] as unknown as { loss_type?: string }).loss_type && (<p className="mt-2 text-xs text-muted">Loss type: <span className="font-medium text-ink">{(match.picks[0] as unknown as { loss_type: string }).loss_type.replace(/-/g, " ")}</span></p>)}<Link href={withLang(`/analysis/${postmortemArticle.slug}`, lang)} className="mt-3 inline-block text-sm font-semibold text-brand transition-colors hover:text-ink">{dict.match.readReview} &rarr;</Link></>
          ) : (match.picks[0] as unknown as { postmortem_approved?: string }).postmortem_approved ? (<><p className="mt-2 text-sm text-ink whitespace-pre-line">{(match.picks[0] as unknown as { postmortem_approved: string }).postmortem_approved.replace(/\*\*/g, "").replace(/\*/g, "")}</p>{match.picks[0].status === "lost" && (match.picks[0] as unknown as { loss_type?: string }).loss_type && (<p className="mt-2 text-xs text-muted">Loss type: <span className="font-medium text-ink">{(match.picks[0] as unknown as { loss_type: string }).loss_type.replace(/-/g, " ")}</span></p>)}</>
          ) : (<p className="mt-2 text-sm text-muted italic">{match.picks[0].author === "scout" ? "Review pending \u2014 the Scout will review this play." : "Review pending \u2014 the Curator will review this play."}</p>)}
        </section>
      )}

      {match.watching && (<section className="mt-8"><h2 className={match.watching.author === "scout" ? "mb-3 font-display text-lg font-bold text-scout" : "mb-3 font-display text-lg font-bold"}>{match.watching.author === "scout" ? dict.match.scoutWatch : dict.match.curatorWatch}</h2><WatchingTeaser items={[match.watching]} lang={lang} hideLinks /></section>)}

      {uniquePosts.length > 0 && (<section className="mt-8"><h2 className="mb-3 font-display text-lg font-bold">{dict.match.articles}</h2><ul className="flex flex-col gap-3">{uniquePosts.map((post) => (<li key={post.id} className="rounded-card border border-line bg-card p-4 shadow-card"><span className="mb-1 inline-block rounded-md bg-card px-2 py-0.5 text-xs font-semibold uppercase text-muted">{post.type}</span><p className="font-display font-bold"><Link href={withLang(`/analysis/${post.slug}`, lang)} className="transition-colors hover:text-brand">{post.title}</Link></p><Link href={withLang(`/analysis/${post.slug}`, lang)} className="mt-1 inline-block text-sm font-semibold text-brand transition-colors hover:text-ink">{dict.match.readArticle} &rarr;</Link></li>))}</ul></section>)}

      {!match.watching && match.picks.length === 0 && uniquePosts.length === 0 && (<div className="mt-8 rounded-card border border-line bg-card px-6 py-12 text-center"><p className="text-muted">{dict.match.noContent}</p></div>)}
    </article>
  );
}
