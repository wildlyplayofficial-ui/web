import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { S } from "@/lib/strings";
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
  title: {
    default: `${S.BRAND} — ${S.TAGLINE}`,
    template: `%s | ${S.BRAND}`,
  },
  description:
    "A daily Over/Under prediction game on aggregate football goals. Pick your side, climb the leaderboard. Entertainment only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0d1117" />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <header className="border-b border-line px-5 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <a href="/" className="font-display text-lg font-bold text-brand">
              {S.BRAND}
            </a>
            <nav className="flex gap-4 text-sm text-muted">
              <a href="/leaderboard" className="hover:text-ink transition">
                {S.LEADERBOARD_TITLE}
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line px-5 py-4">
          <p className="mx-auto max-w-lg text-center text-xs text-muted">
            {S.DISCLAIMER} {S.NOT_SPORTSBOOK}
          </p>
        </footer>
      </body>
    </html>
  );
}
