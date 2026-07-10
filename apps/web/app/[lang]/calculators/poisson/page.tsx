import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { PoissonCalculator } from "./calculator";

export const revalidate = 86400;

const NAME = "Over/Under Poisson Calculator";
const DESC =
  "Turn expected goals (xG) into Over/Under, BTTS and correct-score probabilities with a Poisson model — the core of how WildlyPlay reads a total.";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  return {
    title: `${NAME} | WildlyPlay`,
    description: DESC,
    alternates: buildAlternates("/calculators/poisson", lang),
    openGraph: {
      title: `${NAME} | WildlyPlay`,
      description: DESC,
      images: [
        {
          url: "/api/og/guide?title=Over%2FUnder%20Poisson%20Calculator&type=calculator",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function PoissonPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  return (
    <div className="mx-auto max-w-[700px] px-5 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.calculators.title, url: "/calculators" },
          { name: NAME, url: "/calculators/poisson" },
        ]}
      />
      <h1 className="gradient-text font-display text-3xl font-bold">{NAME}</h1>
      <p className="mt-2 text-muted">{DESC}</p>

      <PoissonCalculator />

      <div className="mt-8 rounded-card border border-line bg-card p-5 text-center shadow-card">
        <Link
          href={withLang("/learn", lang)}
          className="text-sm font-medium text-brand hover:underline"
        >
          More betting tools &amp; guides &rarr;
        </Link>
      </div>
    </div>
  );
}
