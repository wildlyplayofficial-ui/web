import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { OddsConverter } from "./calculator";

export const revalidate = 86400;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.calculators.oddsConverter} | WildlyPlay`,
    description: dict.calculators.oddsConverterDesc,
    alternates: buildAlternates("/calculators/odds-converter", lang),
    openGraph: {
      title: `${dict.calculators.oddsConverter} | WildlyPlay`,
      description: dict.calculators.oddsConverterDesc,
      images: [{ url: "/api/og/editorial?title=Odds%20Converter&subtitle=Convert%20between%20decimal%2C%20fractional%2C%20American%2C%20and%20Malay%20odds", width: 1200, height: 630 }],
    },
  };
}

export default async function OddsConverterPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  return (
    <div className="mx-auto max-w-[700px] px-5 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.calculators.title, url: "/calculators" },
          { name: dict.calculators.oddsConverter, url: "/calculators/odds-converter" },
        ]}
      />
      <h1 className="gradient-text font-display text-3xl font-bold">
        {dict.calculators.oddsConverter}
      </h1>
      <p className="mt-2 text-muted">{dict.calculators.oddsConverterDesc}</p>
      <OddsConverter />
      <div className="mt-8 rounded-card border border-line bg-card p-5 text-center shadow-card">
        <Link
          href={withLang("/guides/odds-formats-explained", lang)}
          className="text-sm font-medium text-brand hover:underline"
        >
          {dict.calculators.oddsConverterCta} &rarr;
        </Link>
      </div>
    </div>
  );
}
