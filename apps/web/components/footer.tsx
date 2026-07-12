"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getDict, resolveLang, withLang } from "@/lib/i18n";
import { trackTgFollowClick } from "@/lib/analytics";

export function Footer() {
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const dict = getDict(lang);

  const links: ReadonlyArray<{ href: string; label: string }> = [
    { href: "/daily-board", label: dict.nav.board },
    { href: "/track-record", label: dict.nav.trackRecord },
    { href: "/analysis", label: dict.nav.analysis },
    { href: "/matches", label: dict.nav.matches },
    { href: "/competitions", label: dict.nav.standings },
    { href: "/learn", label: dict.nav.learn },
    { href: "/guides", label: dict.nav.guides },
    { href: "/calculators", label: dict.nav.calculators },
    { href: "/about", label: dict.nav.about },
    { href: "/transparency", label: dict.nav.transparency },
    { href: "/responsible-play", label: dict.nav.responsiblePlay },
  ];

  return (
    <footer className="mt-16 border-t border-line py-12">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-5 text-center">
        <div>
          <span className="font-display text-xl font-bold">
            <span className="text-ink">Wildly</span>
            <span className="text-brand">Play</span>
          </span>
          <p className="mt-2 text-sm text-muted">{dict.footerDisclaimer}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={withLang(link.href, lang)}
              className="text-sm text-muted transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://t.me/wildlyplay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-brand"
            onClick={trackTgFollowClick}
          >
            Telegram
          </a>
        </nav>
        <p className="text-xs text-muted">© 2026 WildlyPlay. All rights reserved.</p>
        <p className="text-xs text-muted/60">Football data provided by the <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">Football-Data.org API</a></p>
      </div>
    </footer>
  );
}
