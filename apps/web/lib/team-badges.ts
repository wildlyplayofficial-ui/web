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
  "dr-congo": "dr-congo",
  "congo-dr": "dr-congo",
  "bosnia-herzegovina": "bosnia-and-herzegovina",
  "cura-ao": "curacao",
  // MLS teams: full name slug → badge key slug
  "los-angeles-galaxy": "la-galaxy",
  "los-angeles-fc": "los-angeles-fc",
  "montreal-impact": "cf-montreal",
  chicago: "chicago-fire",
};

/** Resolve a slug token (e.g. "france", "united-states") back to a display name. */
export function teamNameFromSlug(token: string): string | null {
  const t = SLUG_ALIASES[token] ?? token;
  return NAME_BY_SLUG[t] ?? null;
}

/** Try all suffix substrings of a hyphenated token to find a team name.
 *  e.g. "no-play-congo-dr" → tries "no-play-congo-dr", "play-congo-dr",
 *  "congo-dr", "dr" — first match wins. */
function findTeamInToken(token: string): string | null {
  const parts = token.split("-");
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join("-");
    const name = teamNameFromSlug(candidate);
    if (name) return name;
  }
  return null;
}

/** Try all prefix substrings of a hyphenated token to find a team name.
 *  e.g. "congo-dr-was-not-a-dead-rubber" → tries full, then "congo-dr-was-not-a-dead",
 *  ..., "congo-dr", "congo" — first match wins. */
function findTeamFromStart(token: string): string | null {
  const parts = token.split("-");
  for (let i = parts.length; i > 0; i--) {
    const candidate = parts.slice(0, i).join("-");
    const name = teamNameFromSlug(candidate);
    if (name) return name;
  }
  return null;
}

/** Parse "…-home-vs-away-YYYY-MM-DD" (or prose suffix) article slugs into two display names. */
export function teamsFromSlug(slug: string): { home: string; away: string } | null {
  const noDate = slug.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const idx = noDate.indexOf("-vs-");
  if (idx < 0) return null;
  const left = noDate.slice(0, idx);
  const right = noDate.slice(idx + 4);

  // Left may carry an editorial prefix; right may carry a prose suffix.
  // Try all suffix substrings of left, all prefix substrings of right.
  // Away also tries suffix substrings as fallback — handles "cf-cruz-azul" where
  // canonical name is "Cruz Azul" (prefix "cf-" not in canonical slug).
  const home = findTeamInToken(left);
  const away = findTeamFromStart(right) ?? findTeamInToken(right);
  if (!home || !away) return null;
  return { home, away };
}

/** Fallback for Desk slugs without "-vs-", e.g. "inter-miami-chicago-thi-truong-…".
 *  Longest team prefix from the start → home; team prefix of the remainder → away.
 *  Requires home at position 0, so prose-only slugs stay unresolved (roundup card). */
export function teamsFromSlugLoose(slug: string): { home: string; away: string } | null {
  const parts = slug.split("-");
  for (let i = parts.length; i > 0; i--) {
    const home = teamNameFromSlug(parts.slice(0, i).join("-"));
    if (!home) continue;
    const away = findTeamFromStart(parts.slice(i).join("-"));
    if (away) return { home, away };
  }
  return null;
}
