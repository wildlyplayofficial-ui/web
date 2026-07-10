import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.nav.learn} | WildlyPlay`,
    description: dict.guides.subtitle,
    alternates: buildAlternates("/learn", lang),
    openGraph: {
      title: `${dict.nav.learn} | WildlyPlay`,
      description: dict.guides.subtitle,
      images: [{ url: "/api/og/editorial?title=Learn&subtitle=Free%20guides%20and%20calculators%20to%20sharpen%20your%20edge", width: 1200, height: 630 }],
    },
  };
}

export default async function LearnHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  const guides = [
    { slug: "what-is-asian-handicap", title: "Asian Handicap" },
    { slug: "how-de-vigging-works", title: "How De-Vigging Works" },
    { slug: "what-is-devigging", title: "What Is De-Vigging?" },
    { slug: "what-is-closing-line-value", title: "Closing Line Value" },
    { slug: "kelly-criterion-betting", title: "Kelly Criterion" },
    { slug: "what-is-value-betting", title: "Value Betting" },
    { slug: "how-to-read-betting-odds", title: "How to Read Odds" },
    { slug: "odds-formats-explained", title: "Odds Formats" },
    { slug: "what-makes-a-good-tipster", title: "Good Tipster" },
    { slug: "no-play-discipline", title: "No-Play Discipline" },
    { slug: "responsible-play-guide", title: "Responsible Play" },
  ];

  const calcs = [
    { slug: "de-vig", title: dict.calculators.deVig, desc: dict.calculators.deVigDesc },
    { slug: "odds-converter", title: dict.calculators.oddsConverter, desc: dict.calculators.oddsConverterDesc },
    { slug: "kelly", title: dict.calculators.kelly, desc: dict.calculators.kellyDesc },
    { slug: "poisson", title: "xG / Poisson Calculator", desc: "Over/Under, BTTS, most-likely score from expected goals" },
  ];

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.nav.learn, url: "/learn" }]} />

      <section className="text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.nav.learn}</h1>
        <p className="mx-auto mt-3 max-w-[600px] text-muted">{dict.guides.subtitle}</p>
      </section>

      {/* Calculators */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">{dict.nav.calculators}</h2>
        <p className="mt-1 text-sm text-muted">{dict.calculators.subtitle}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {calcs.map((c) => (
            <Link
              key={c.slug}
              href={withLang(`/calculators/${c.slug}`, lang)}
              className="group rounded-card border border-brand/30 bg-brand-dim/30 p-5 transition-colors hover:border-brand/60"
            >
              <h3 className="font-display text-base font-bold transition-colors group-hover:text-brand">{c.title}</h3>
              <p className="mt-2 text-xs text-muted">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">{dict.nav.guides}</h2>
        <p className="mt-1 text-sm text-muted">{dict.guides.subtitle}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={withLang(`/guides/${g.slug}`, lang)}
              className="group flex items-center gap-3 rounded-card border border-line bg-card p-4 transition-colors hover:border-brand/30"
            >
              <img
                src={`/images/guides/${g.slug.replace("what-is-asian-handicap", "asian-handicap").replace("how-de-vigging-works", "de-vig-methods").replace("what-is-devigging", "de-vig-intro").replace("what-is-closing-line-value", "closing-line-value").replace("kelly-criterion-betting", "kelly-criterion").replace("what-is-value-betting", "value-betting").replace("how-to-read-betting-odds", "odds-anatomy").replace("odds-formats-explained", "odds-formats").replace("what-makes-a-good-tipster", "good-tipster").replace("no-play-discipline", "no-play-discipline").replace("responsible-play-guide", "responsible-play")}.svg`}
                alt=""
                width={80}
                height={40}
                className="shrink-0 rounded"
                loading="lazy"
              />
              <span className="font-display text-sm font-bold transition-colors group-hover:text-brand">{g.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
