/**
 * Guides whose Vietnamese version must stay out of Google (Nick + Peter, 28/7 → refined 4/8).
 *
 * Only these 6 are blocked for `vi`. The remaining guides are indexable in every
 * language. Applies to BOTH URL shapes the guide content is served under:
 * `/vi/guides/{slug}` and `/vi/analysis/{slug}` — blocking only the first left
 * the content reachable through the second.
 */
export const VI_BLOCKED_GUIDE_SLUGS = new Set([
  "what-is-value-betting",
  "what-is-closing-line-value",
  "kelly-criterion-betting",
  "odds-formats-explained",
  "how-de-vigging-works",
  "responsible-play-guide",
]);

export function isViBlockedGuide(lang: string, slug: string): boolean {
  return lang === "vi" && VI_BLOCKED_GUIDE_SLUGS.has(slug);
}
