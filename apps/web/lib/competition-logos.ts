const BASE = 'https://rtsyrktpodspdobelyqs.supabase.co/storage/v1/object/public/competition-logos';

/** Maps competition slug → self-hosted logo URL (Supabase Storage). */
export const COMPETITION_LOGOS: Record<string, string> = {
  'bundesliga':       `${BASE}/bundesliga.png`,
  'premier-league':   `${BASE}/premier-league.png`,
  'la-liga':          `${BASE}/la-liga.png`,
  'liga-mx':          `${BASE}/liga-mx.png`,
  'ligue-1':          `${BASE}/ligue-1.png`,
  'mls':              `${BASE}/mls.png`,
  'serie-a':          `${BASE}/serie-a.png`,
  'champions-league': `${BASE}/champions-league.png`,
  'world-cup-2026':   `${BASE}/world-cup-2026.png`,
};
