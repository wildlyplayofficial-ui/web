"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";

const LANG_PREFIX_RE = /^\/(vi|th|es)(\/|$)/;

const navItems: ReadonlyArray<{ href: string; key: "board" | "dailyLine" | "archive" | "stats" | "matches" | "standings" | "news" | "calculators" | "about" }> = [
  { href: "/", key: "board" },
  { href: "/daily-line", key: "dailyLine" },
  { href: "/archive", key: "archive" },
  { href: "/stats", key: "stats" },
  { href: "/matches", key: "matches" },
  { href: "/standings", key: "standings" },
  { href: "/news", key: "news" },
  { href: "/calculators", key: "calculators" },
  { href: "/about", key: "about" },
];

/** Strip any existing lang prefix from a pathname. */
function stripLangPrefix(pathname: string): string {
  return pathname.replace(LANG_PREFIX_RE, "/");
}

function LocaleSwitch({ lang, onNavigate }: { lang: Lang; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bare = stripLangPrefix(pathname);
  const qs = searchParams.toString();
  const bareFull = qs ? `${bare}?${qs}` : bare;
  return (
    <div className="flex gap-1 rounded-lg bg-card p-1">
      {LANGS.map((l) => (
        <Link
          key={l}
          href={withLang(bareFull, l)}
          onClick={onNavigate}
          className={`rounded-md px-2.5 py-1 font-display text-xs font-semibold uppercase transition-colors ${
            l === lang ? "bg-brand text-bg" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const dict = getDict(lang);
  const [open, setOpen] = useState(false);

  // Strip lang prefix for route matching
  const barePath = stripLangPrefix(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5">
        <Link href={withLang("/", lang)} className="font-display text-2xl font-bold">
          <span className="text-ink">Wildly</span>
          <span className="text-brand">Play</span>
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="h-0.5 w-6 rounded bg-ink" />
          <span className="h-0.5 w-6 rounded bg-ink" />
          <span className="h-0.5 w-6 rounded bg-ink" />
        </button>

        <nav
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-16 flex-col gap-4 border-b border-line bg-bg p-6 md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:p-0`}
        >
          <ul className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={withLang(item.href, lang)}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium transition-colors hover:text-ink ${
                    (item.href === "/" ? barePath === "/" : barePath.startsWith(item.href)) ? "text-ink" : "text-muted"
                  }`}
                >
                  {dict.nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <LocaleSwitch lang={lang} onNavigate={() => setOpen(false)} />
            <ThemeToggle onToggle={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </header>
  );
}
