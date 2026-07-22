import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 86400;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.calculators.title,
    description: dict.calculators.subtitle,
    alternates: buildAlternates("/calculators", lang),
    openGraph: {
      title: `${dict.calculators.title} | WildlyPlay`,
      description: dict.calculators.subtitle,
      images: [{ url: "/api/og/editorial?title=Free%20Betting%20Calculators&subtitle=De-vig%2C%20odds%20converter%2C%20and%20Kelly%20criterion", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.calculators.title} | WildlyPlay`,
      description: dict.calculators.subtitle,
    },
  };
}

const tools = [
  { slug: "de-vig", key: "deVig" as const, descKey: "deVigDesc" as const },
  { slug: "odds-converter", key: "oddsConverter" as const, descKey: "oddsConverterDesc" as const },
  { slug: "kelly", key: "kelly" as const, descKey: "kellyDesc" as const },
] as const;

export default async function CalculatorsPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.calculators.title, url: "/calculators" },
        ]}
      />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">
          {dict.calculators.title}
        </h1>
        <p className="mt-3 text-muted">{dict.calculators.subtitle}</p>
      </section>

      <div className="flex flex-col gap-4 pb-8">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={withLang(`/calculators/${tool.slug}`, lang)}
            className="group rounded-card border border-line bg-card p-6 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
          >
            <h2 className="font-display text-xl font-bold transition-colors group-hover:text-brand">
              {dict.calculators[tool.key]}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {dict.calculators[tool.descKey]}
            </p>
          </Link>
        ))}
        <Link
          href={withLang("/calculators/poisson", lang)}
          className="group rounded-card border border-brand/30 bg-brand-dim/20 p-6 shadow-card transition-colors hover:border-brand/60"
        >
          <h2 className="font-display text-xl font-bold transition-colors group-hover:text-brand">
            xG / Poisson Calculator
          </h2>
          <p className="mt-2 text-sm text-muted">
            Over/Under, BTTS, most-likely score, and 1X2 fair probabilities from expected goals.
          </p>
        </Link>
        <p className="pt-2 text-center text-sm text-muted">
          Not sure which tool to use?{" "}
          <Link href={withLang("/guides", lang)} className="font-semibold text-brand hover:underline">
            Read our betting guides &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
