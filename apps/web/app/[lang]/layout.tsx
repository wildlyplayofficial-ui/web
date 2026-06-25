import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HtmlLang } from "@/components/html-lang";
import { LiveTicker } from "@/components/live-ticker";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { LANGS, type Lang } from "@/lib/i18n";

export async function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

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
        <Header />
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
