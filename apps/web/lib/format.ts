import type { Lang } from "./i18n";
import type { Pick } from "./types";

export type BadgeKind = "upcoming" | "live" | "won" | "lost" | "push" | "void";

/** Public badge for a pick. Settled statuses come straight from the DB
 *  (half-win already mapped to 'won' by the settlement engine, decision #2). */
export function badgeFor(pick: Pick, now: Date = new Date()): BadgeKind {
  if (pick.status === "published") {
    return new Date(pick.kickoff_utc) <= now ? "live" : "upcoming";
  }
  return pick.status;
}

/** Market display names (shared by the pick card and the play detail page). */
export const marketLabels: Record<Pick["market"], string> = {
  ah: "Asian Handicap",
  ou: "Over/Under",
  "1x2": "1X2",
  btts: "BTTS",
  other: "Special",
};

/** Intl locales per UI language (Gregorian calendar everywhere for consistency). */
export const locales: Record<Lang, string> = {
  en: "en-GB",
  vi: "vi-VN",
  th: "th-TH-u-ca-gregory",
  es: "es-419",
};

/** Kickoff shown in UTC for a global audience (and stable server rendering). */
export function formatKickoff(iso: string, lang: Lang): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${day} · ${time} UTC`;
}

/** D1 (§9): publish-proof timestamp — always includes the year so archive picks stay unambiguous. */
export function formatPostedAt(iso: string, lang: Lang): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${day} · ${time} UTC`;
}

export function formatBoardDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonth(yyyyMm: string, lang: Lang): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Intl.DateTimeFormat(locales[lang], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/** "+0.48u" / "−1.00u" / "0.00u" — real Asian-handicap P/L. */
export function formatUnits(units: number): string {
  const abs = Math.abs(units).toFixed(2);
  if (units > 0) return `+${abs}u`;
  if (units < 0) return `−${abs}u`;
  return `${abs}u`;
}
