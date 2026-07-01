import type { Metadata } from "next";
import { buildAlternates, getDict, resolveLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DeVigCalculator } from "./calculator";

export const revalidate = 86400;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: `${dict.calculators.deVig} | WildlyPlay`,
    description: dict.calculators.deVigDesc,
    alternates: buildAlternates("/calculators/de-vig", lang),
    openGraph: {
      title: `${dict.calculators.deVig} | WildlyPlay`,
      description: dict.calculators.deVigDesc,
    },
  };
}

export default async function DeVigPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);

  return (
    <div className="mx-auto max-w-[700px] px-5 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.calculators.title, url: "/calculators" },
          { name: dict.calculators.deVig, url: "/calculators/de-vig" },
        ]}
      />
      <h1 className="gradient-text font-display text-3xl font-bold">
        {dict.calculators.deVig}
      </h1>
      <p className="mt-2 text-muted">{dict.calculators.deVigDesc}</p>
      <DeVigCalculator />
    </div>
  );
}
