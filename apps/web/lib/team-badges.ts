import clubBadges from "@/lib/data/club-badges.json";
import countryIso from "@/lib/data/country-iso.json";

/** Club crest URLs keyed by the exact team name Livescore renders (Liga MX + MLS). */
const CLUB: Record<string, string> = clubBadges;
/** Country name → ISO code for flag CDN (World Cup national teams). */
const ISO: Record<string, string> = countryIso;

/**
 * Resolve a badge image URL for a standings row by team name.
 *  - Liga MX / MLS clubs → TheSportsDB crest (static cache).
 *  - World Cup nations   → flagcdn flag by ISO code.
 *  - Everything else      → null (caller falls back to the emoji flag).
 */
export function teamBadge(name: string): string | null {
  const crest = CLUB[name];
  if (crest) return crest;

  const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const iso = ISO[name] ?? ISO[stripped];
  if (iso) return `https://flagcdn.com/w160/${iso}.png`;

  return null;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Reverse index: slugified team name → canonical display name (nations + clubs). */
const NAME_BY_SLUG: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const name of [...Object.keys(ISO), ...Object.keys(CLUB)]) {
    map[slugify(name)] = name;
  }
  return map;
})();

/** Slug aliases where the article slug differs from the canonical team name. */
const SLUG_ALIASES: Record<string, string> = {
  "czech-republic": "czechia",
  turkiye: "turkey",
  "korea-republic": "south-korea",
  "dr-congo": "congo-dr",
};

/** Resolve a slug token (e.g. "france", "united-states") back to a display name. */
export function teamNameFromSlug(token: string): string | null {
  const t = SLUG_ALIASES[token] ?? token;
  return NAME_BY_SLUG[t] ?? null;
}

/** Parse "…-home-vs-away-YYYY-MM-DD" article slugs into two display names. */
export function teamsFromSlug(slug: string): { home: string; away: string } | null {
  const noDate = slug.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const idx = noDate.indexOf("-vs-");
  if (idx < 0) return null;
  const left = noDate.slice(0, idx);
  const right = noDate.slice(idx + 4);

  // Left may carry an editorial prefix ("news-", "preview-"); try full, then drop it.
  const home =
    teamNameFromSlug(left) ??
    teamNameFromSlug(left.split("-").slice(1).join("-"));
  const away = teamNameFromSlug(right);
  if (!home || !away) return null;
  return { home, away };
}
