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
