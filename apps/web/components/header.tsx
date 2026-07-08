"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";

interface NavCompetition {
  name: string;
  href: string;
}

const LANG_PREFIX_RE = /^\/(vi|th|es)(\/|$)/;

const navItems: ReadonlyArray<{ href: string; key: "board" | "dailyLine" | "archive" | "stats" | "matches" | "standings" | "news" | "about" }> = [
  { href: "/", key: "board" },
  { href: "/daily-line", key: "dailyLine" },
  { href: "/archive", key: "archive" },
  { href: "/stats", key: "stats" },
  { href: "/matches", key: "matches" },
  { href: "/standings", key: "standings" },
  { href: "/news", key: "news" },
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

/**
 * "Standings" nav entry as a dropdown of competitions. Inline list on mobile
 * (the nav is already an expanded column); absolute card menu on desktop.
 * Falls back to a plain link to /standings when no competitions loaded.
 */
function StandingsNavItem({
  label,
  active,
  competitions,
  lang,
  onNavigate,
}: {
  label: string;
  active: boolean;
  competitions: NavCompetition[];
  lang: Lang;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (competitions.length === 0) {
    return (
      <li>
        <Link
          href={withLang("/standings", lang)}
          onClick={onNavigate}
          className={`text-sm font-medium transition-colors hover:text-ink ${active ? "text-ink" : "text-muted"}`}
        >
          {label}
        </Link>
      </li>
    );
  }

  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-ink ${active ? "text-ink" : "text-muted"}`}
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="mt-2 flex flex-col gap-3 pl-3 md:absolute md:left-0 md:z-20 md:w-56 md:gap-0 md:rounded-card md:border md:border-line md:bg-card md:py-1 md:pl-0 md:shadow-card"
        >
          {competitions.map((c) => (
            <li key={c.href} role="none">
              <Link
                role="menuitem"
                href={withLang(c.href, lang)}
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                }}
                className="block text-sm text-muted transition-colors hover:text-ink md:px-4 md:py-2 md:hover:bg-card-hover"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Header({ competitions = [] }: { competitions?: NavCompetition[] }) {
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
            {navItems.map((item) => {
              const active = item.href === "/" ? barePath === "/" : barePath.startsWith(item.href);
              if (item.key === "standings") {
                return (
                  <StandingsNavItem
                    key={item.href}
                    label={dict.nav.standings}
                    active={active}
                    competitions={competitions}
                    lang={lang}
                    onNavigate={() => setOpen(false)}
                  />
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={withLang(item.href, lang)}
                    onClick={() => setOpen(false)}
                    className={`text-sm font-medium transition-colors hover:text-ink ${active ? "text-ink" : "text-muted"}`}
                  >
                    {dict.nav[item.key]}
                  </Link>
                </li>
              );
            })}
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
