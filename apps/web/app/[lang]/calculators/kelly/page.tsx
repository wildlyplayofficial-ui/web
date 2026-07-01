import type { Metadata } from "next";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { KellyCalculator } from "./calculator";

export const revalidate = 86400;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.calculators.kelly} | WildlyPlay`,
    description: dict.calculators.kellyDesc,
    alternates: buildAlternates("/calculators/kelly", lang),
    openGraph: {
      title: `${dict.calculators.kelly} | WildlyPlay`,
      description: dict.calculators.kellyDesc,
    },
  };
}

export default async function KellyPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  return (
    <div className="mx-auto max-w-[700px] px-5 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.calculators.title, url: "/calculators" },
          { name: dict.calculators.kelly, url: "/calculators/kelly" },
        ]}
      />
      <h1 className="gradient-text font-display text-3xl font-bold">
        {dict.calculators.kelly}
      </h1>
      <p className="mt-2 text-muted">{dict.calculators.kellyDesc}</p>
      <KellyCalculator />
    </div>
  );
}
