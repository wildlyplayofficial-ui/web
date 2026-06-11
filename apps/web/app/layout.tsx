import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
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
  },
  twitter: {
    card: "summary",
    title: "WildlyPlay — Handpicked plays for the global crowd",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
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
