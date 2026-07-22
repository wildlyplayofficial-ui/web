import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Inter, Space_Grotesk, Noto_Sans_Thai } from "next/font/google";
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
    "Free daily football picks by a human curator — every play public forever, wins and losses. Track record, analysis, odds tools and guides across Premier League, La Liga, Serie A and more.",
  openGraph: {
    siteName: "WildlyPlay",
    type: "website",
    locale: "en_US",
    title: "WildlyPlay — Handpicked plays for the global crowd",
    description:
      "Free daily football picks by a human curator — every play public forever, wins and losses. Track record, analysis and odds tools.",
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
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAdmin = pathname.includes("/admin");
  const lang = headersList.get("x-lang") || "en";

  // Static inline scripts — hardcoded strings only, no user input (safe from XSS)
  const themeScript = '(function(){try{var t=localStorage.getItem("wp_theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark");if(!t)localStorage.setItem("wp_theme","dark")}}catch(e){}})()';
  const swScript = 'if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}';

  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable} ${notoSansThai.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#00e676" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {!isAdmin && <script dangerouslySetInnerHTML={{ __html: swScript }} />}
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
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: "https://www.wildlyplay.com/matches?q={search_term_string}" },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "WildlyPlay",
                  url: "https://www.wildlyplay.com",
                  logo: { "@type": "ImageObject", url: "https://www.wildlyplay.com/icons/icon-512x512.png" },
                  description: "Handpicked plays for the global crowd. Transparent sports picks with full public track record, CLV tracking, and AI-powered multilingual content.",
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
        {children}
        {!isAdmin && <GoogleAnalytics gaId="G-HM4G87BT3Q" />}
      </body>
    </html>
  );
}
