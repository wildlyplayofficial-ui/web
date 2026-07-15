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

type NavLink = { name: string; href: string };
/** A dropdown row: a link, or a visual divider between groups. */
type NavItem = NavLink | { divider: true };
/** A top-level nav cluster: either a single link or a dropdown of items. */
type NavCluster = { label: string; href: string } | { label: string; items: NavItem[] };

const LANG_PREFIX_RE = /^\/(vi|th|es)(\/|$)/;

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
          prefetch={false}
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
 * A nav cluster rendered as a dropdown of links. Inline list on mobile
 * (the nav is already an expanded column); absolute card menu on desktop.
 */
function NavDropdown({
  label,
  active,
  items,
  lang,
  onNavigate,
}: {
  label: string;
  active: boolean;
  items: NavItem[];
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
          {items.map((it, i) =>
            "divider" in it ? (
              <li
                key={`divider-${i}`}
                role="separator"
                aria-hidden="true"
                className="border-t border-line md:my-1"
              />
            ) : (
              <li key={it.href} role="none">
                <Link
                  role="menuitem"
                  href={withLang(it.href, lang)}
                  onClick={() => {
                    setOpen(false);
                    onNavigate();
                  }}
                  className="block text-sm text-muted transition-colors hover:text-ink md:px-4 md:py-2 md:hover:bg-card-hover"
                >
                  {it.name}
                </Link>
              </li>
            ),
          )}
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
  const isActive = (href: string) => (href === "/" ? barePath === "/" : barePath.startsWith(href));

  const nav = dict.nav;
  const clusters: NavCluster[] = [
    {
      label: nav.todaysPick,
      items: [
        { name: nav.todaysPick, href: "/daily-board" },
        { name: nav.dailyLine, href: "/daily-line" },
      ],
    },
    {
      label: nav.trackRecord,
      items: [
        { name: nav.trackRecord, href: "/track-record" },
        { name: nav.archive, href: "/archive" },
        { name: nav.stats, href: "/stats" },
        { name: nav.transparency, href: "/transparency" },
      ],
    },
    { label: nav.analysis, href: "/analysis" },
    { label: nav.news, href: "/news" },
    {
      label: nav.matches,
      items: [
        { name: nav.allMatches, href: "/matches" },
        ...(competitions.length > 0 ? [{ divider: true } as const] : []),
        ...competitions,
      ],
    },
    {
      label: nav.learn,
      items: [
        { name: nav.learn, href: "/learn" },
        { name: nav.guides, href: "/guides" },
        { name: nav.calculators, href: "/calculators" },
      ],
    },
    { label: nav.about, href: "/about" },
  ];

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
            {clusters.map((cluster) => {
              if ("href" in cluster) {
                return (
                  <li key={cluster.href}>
                    <Link
                      href={withLang(cluster.href, lang)}
                      onClick={() => setOpen(false)}
                      className={`text-sm font-medium transition-colors hover:text-ink ${isActive(cluster.href) ? "text-ink" : "text-muted"}`}
                    >
                      {cluster.label}
                    </Link>
                  </li>
                );
              }
              const active = cluster.items.some((it) => "href" in it && isActive(it.href));
              return (
                <NavDropdown
                  key={cluster.label}
                  label={cluster.label}
                  active={active}
                  items={cluster.items}
                  lang={lang}
                  onNavigate={() => setOpen(false)}
                />
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
