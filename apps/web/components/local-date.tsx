"use client";

import { useEffect, useState } from "react";

interface LocalDateProps {
  iso: string;
  /** BCP 47 locale for the active site language (e.g. locales[lang]). */
  locale: string;
  /** "long" = 12 July 2026 (article detail), "short" = 12 Jul (feed fallback). */
  format?: "long" | "short";
  className?: string;
}

const FORMATS = {
  long: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short" },
} as const;

/** Shows a date in the viewer's local timezone (same pattern as LocalKickoffTime). */
export function LocalDate({ iso, locale, format = "long", className }: LocalDateProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    setLabel(new Intl.DateTimeFormat(locale, FORMATS[format]).format(d));
  }, [iso, locale, format]);

  // SSR fallback: same fields in UTC, swapped to browser TZ after hydration
  if (!label) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const utc = new Intl.DateTimeFormat(locale, { ...FORMATS[format], timeZone: "UTC" }).format(d);
    return (
      <time dateTime={iso} className={className}>{utc}</time>
    );
  }

  return (
    <time dateTime={iso} className={className}>{label}</time>
  );
}
