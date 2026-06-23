import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Inter, Space_Grotesk, Noto_Sans_Thai } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PickCardSkeleton, MatchCardSkeleton } from "@/components/skeleton";
import { HtmlLang } from "@/components/html-lang";
import { LiveTicker } from "@/components/live-ticker";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "vietnamese"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wildlyplay.com"),
  title: {
    default: "WildlyPlay — Handpicked plays for the global crowd",
    template: "%s | WildlyPlay",
  },
  description:
    "Curator-led football picks, AI-operated. Every pick public forever — wins and losses. Entertainment only.",
  openGraph: {
    siteName: "WildlyPlay",
    type: "website",
    locale: "en_US",
    title: "WildlyPlay — Handpicked plays for the global crowd",
    description:
      "Curator-led football picks, AI-operated. Every pick public forever — wins and losses.",
    images: [{ url: "/og-home.png", width: 1200, height: 630, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WildlyPlay — Handpicked plays for the global crowd",
    images: [{ url: "/og-home.png", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Admin pages render their own shell — skip public header/footer/ticker.
  // Use the proxy to inject x-pathname header for detection.
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("x-url") || "";
  const isAdmin = pathname.includes("/admin");
  const lang = headersList.get("x-lang") || "en";

  // Static inline scripts — hardcoded strings only, no user input (safe from XSS)
  const themeScript = '(function(){try{var t=localStorage.getItem("wp_theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark");if(!t)localStorage.setItem("wp_theme","dark")}}catch(e){}})()';
  const swScript = 'if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}';

  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable} ${notoSansThai.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Theme script MUST be first — blocks render to prevent FOUC (dark↔light flash) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#00e676" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {!isAdmin && <script dangerouslySetInnerHTML={{ __html: swScript }} />}
        {/* Organization + WebSite schema — static, no user input */}
        {!isAdmin && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "WildlyPlay",
                  url: "https://www.wildlyplay.com",
                  description: "Curator-led football picks, AI-operated. Every pick public forever.",
                },
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "WildlyPlay",
                  url: "https://www.wildlyplay.com",
                  logo: "https://www.wildlyplay.com/icons/icon-512x512.png",
                  sameAs: [
                    "https://t.me/wildlyplay",
                    "https://facebook.com/wildlyplay",
                    "https://x.com/WildlyPlayGlob",
                  ],
                },
              ]),
            }}
          />
        )}
      </head>
      <body className={isAdmin ? "h-full font-sans" : "flex min-h-full flex-col font-sans"}>
        {!isAdmin && (
          <>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg">
              Skip to content
            </a>
            <Suspense fallback={null}><HtmlLang /></Suspense>
            <Suspense fallback={null}><LiveTicker /></Suspense>
            <Suspense fallback={<div className="h-16 border-b border-line" />}><Header /></Suspense>
          </>
        )}
        {isAdmin ? children : <main id="main" className="flex-1">{children}</main>}
        {!isAdmin && <Suspense fallback={null}><Footer /></Suspense>}
        {!isAdmin && <Suspense fallback={null}><PwaInstallPrompt /></Suspense>}
        {!isAdmin && <GoogleAnalytics gaId="G-HM4G87BT3Q" />}
      </body>
    </html>
  );
}
