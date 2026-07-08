import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HtmlLang } from "@/components/html-lang";
import { LiveTicker } from "@/components/live-ticker";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { LANGS, type Lang } from "@/lib/i18n";

export async function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

/** Fetches active competitions for the header's Standings dropdown. */
async function HeaderWithData() {
  const comps = await getStandingsCompetitions();
  const competitions = comps
    .filter((c) => c.status === "active")
    .map((c) => ({
      name: c.name,
      // World Cup keeps its canonical index page; others go to their slug page.
      href: c.livescoreId === 362 ? "/standings" : `/standings/${c.slug}`,
    }));
  return <Header competitions={competitions} />;
}

// Only match known languages — reject unknown params like /tma, /api, etc.
export const dynamicParams = false;

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!(LANGS as readonly string[]).includes(lang)) notFound();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
      >
        Skip to content
      </a>
      <Suspense fallback={null}>
        <HtmlLang lang={lang as Lang} />
      </Suspense>
      <Suspense fallback={null}>
        <LiveTicker />
      </Suspense>
      <Suspense fallback={<div className="h-16 border-b border-line" />}>
        <HeaderWithData />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <PwaInstallPrompt />
      </Suspense>
    </>
  );
}
