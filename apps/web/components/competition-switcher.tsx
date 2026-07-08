"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";

interface SwitcherCompetition {
  id: string;
  name: string;
  slug: string;
}

interface CompetitionSwitcherProps {
  competitions: SwitcherCompetition[];
  currentSlug: string;
  lang: Lang;
  label: string;
}

/** Dropdown to jump between active competitions' standings pages. */
export function CompetitionSwitcher({ competitions, currentSlug, lang, label }: CompetitionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = competitions.find((c) => c.slug === currentSlug);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Nothing to switch to
  if (competitions.length <= 1) return null;

  return (
    <div ref={ref} className="relative mx-auto mb-8 w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-card border border-line bg-card px-4 py-2.5 font-display text-sm font-semibold transition-colors hover:border-line-hover hover:bg-card-hover"
      >
        <span className="truncate">{current?.name ?? label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-card border border-line bg-card py-1 shadow-card"
        >
          {competitions.map((c) => {
            const active = c.slug === currentSlug;
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <Link
                  href={withLang(`/standings/${c.slug}`, lang)}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors hover:bg-card-hover ${active ? "font-semibold text-ink" : "text-muted"}`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
