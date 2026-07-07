/**
 * Max time after kickoff a match can still be considered "live".
 * Beyond this, a match is treated as finished even if the data feed is stuck
 * reporting it live (e.g. LiveScore keeping a match at minute 90 with a
 * non-FT status). 3.5h safely clears regular time, extra time, and penalties
 * without misfiring on a genuinely live match (which is only ~2h past kickoff).
 * Shared by matches.ts (server derivation) and match-status.tsx (client fallback)
 * so both agree on the same threshold — no disagreement window.
 */
export const MAX_LIVE_MS = 3.5 * 60 * 60 * 1000;
