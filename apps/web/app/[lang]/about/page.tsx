import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { buildPerson } from "@/lib/jsonld";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { copy } from "./copy";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: copy[lang].title,
    description: copy[lang].intro.slice(0, 160),
    openGraph: { title: `${copy[lang].title} | WildlyPlay`, images: [{ url: "/api/og/editorial?title=About%20WildlyPlay&subtitle=The%20Curator%20%E2%80%94%20human-picked.%20The%20Scout%20%E2%80%94%20openly%20AI.", width: 1200, height: 630 }] },
    alternates: buildAlternates("/about", lang),
  };
}

export default async function AboutPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const c = copy[lang];
  const competitions = await getStandingsCompetitions();

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"About",url:"/about"}]} />
      {/* Person schema for E-E-A-T */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPerson()) }} />
      <h1 className="gradient-text text-center font-display text-4xl font-bold">{c.title}</h1>
      <p className="mx-auto mt-6 max-w-[680px] text-center leading-relaxed text-ink/90">
        {c.intro}
      </p>

      {/* 3 value cards */}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {c.cards.map((card) => (
          <div key={card.heading} className="rounded-card border border-line bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-brand">{card.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{card.body}</p>
          </div>
        ))}
      </div>

      {/* Personas: Curator (human) + Scout (AI) — firewall */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-brand/30 bg-brand-dim/30 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-bg">C</span>
            <div>
              <h2 className="font-display text-lg font-bold">{c.personas[0].name}</h2>
              <p className="text-xs font-semibold text-brand">{c.personas[0].role}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{c.personas[0].description}</p>
        </div>
        <div className="rounded-card border border-[#6b9e9e]/30 bg-[#6b9e9e]/[.06] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b9e9e] text-lg font-bold text-bg">S</span>
            <div>
              <h2 className="font-display text-lg font-bold">{c.personas[1].name}</h2>
              <p className="text-xs font-semibold text-[#6b9e9e]">{c.personas[1].role}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{c.personas[1].description}</p>
        </div>
      </div>

      {/* The promise */}
      <section className="mt-12 rounded-card border border-line bg-card p-8">
        <h2 className="font-display text-2xl font-bold">{c.promiseTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {c.promises.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <span className="mt-0.5 text-brand">{"\u2713"}</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* How picks are made — 5-step methodology */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">{c.methodTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.methodIntro}</p>
        <ol className="mt-6 flex flex-col gap-4">
          {c.methodSteps.map((step, i) => (
            <li key={step.title} className="rounded-card border border-line bg-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-bg">{i + 1}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-brand">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Track record — link to /transparency */}
      <section className="mt-12 rounded-card border border-brand/30 bg-brand-dim/30 p-8 text-center">
        <h2 className="font-display text-2xl font-bold">{c.trackTitle}</h2>
        <p className="mx-auto mt-3 max-w-[600px] text-sm leading-relaxed text-muted">{c.trackBody}</p>
        <Link href={withLang("/transparency", lang)} className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
          {c.trackCta}
        </Link>
      </section>

      {/* Leagues we cover — dynamic grid */}
      {competitions.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">{c.leaguesTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{c.leaguesIntro}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {competitions.filter((comp) => comp.slug).map((comp) => (
              <Link key={comp.id} href={withLang(`/competitions/${comp.slug}`, lang)} className="rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/50">
                <h3 className="font-display font-semibold text-ink">{comp.name}</h3>
                {comp.season && (
                  <p className="mt-1 text-xs text-muted">{c.leaguesSeason}: {comp.season}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Free tools — 4 calculators */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">{c.toolsTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.toolsIntro}</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {c.tools.map((tool) => (
            <Link key={tool.href} href={withLang(tool.href, lang)} className="rounded-card border border-line bg-card p-4 text-center shadow-card transition-colors hover:border-brand/50">
              <span className="text-2xl">{tool.emoji}</span>
              <p className="mt-2 text-sm font-semibold text-ink">{tool.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Responsible play */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg font-semibold text-muted">{c.responsibleTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.responsibleBody}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {c.helplines.map((h) => (
            <li key={h.name} className="text-xs text-muted">
              <span className="font-semibold">{h.name}</span> &mdash; {h.detail}
            </li>
          ))}
        </ul>
      </section>

      {/* Contact / social links */}
      <section className="mt-8 border-t border-line pt-8">
        <h2 className="font-display text-lg font-semibold text-muted">{c.contactTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.contactBody}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a href="https://t.me/wildlyplay" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">Telegram</a>
          <a href="https://x.com/WildlyPlayGlob" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">X / Twitter</a>
          <a href="https://www.facebook.com/wildlyplay" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">Facebook</a>
        </div>
      </section>
    </div>
  );
}
