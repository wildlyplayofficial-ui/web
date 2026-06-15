import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HtmlLang } from "@/components/html-lang";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wildlyplay.com"),
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
    images: ["/api/og/home"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WildlyPlay — Handpicked plays for the global crowd",
    images: ["/api/og/home"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#00e676" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Prevent flash of wrong theme — static string, no user input */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("wp_theme");if(t==="light")document.documentElement.classList.remove("dark")}catch(e){}})()`,
          }}
        />
        {/* Register service worker for PWA support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={null}>
          <HtmlLang />
        </Suspense>
        <Suspense fallback={<div className="h-16 border-b border-line" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
