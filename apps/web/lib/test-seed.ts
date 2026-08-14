import type { Pick } from "./types";

/*
 * TEST SEED — remove when real picks flow.
 *
 * The Daily Board and the homepage predictions slot are empty before the season
 * starts (no curator picks exist yet). This in-code fallback lets the ESPN-style
 * redesign render in the Vercel preview. It is NEVER written to any database:
 * pages import it and show it ONLY when there are zero real curator picks.
 *
 * To remove: delete this file and the `?? TEST_SEED_PICK` / `TEST_SEED_PREDICTED`
 * fallbacks in app/[lang]/page.tsx and app/[lang]/daily-board/page.tsx.
 */

/** Kicks off ~2 days out so the badge always reads "upcoming", not "live". */
const KICKOFF_UTC = new Date(Date.now() + 2 * 86_400_000).toISOString();
const PUBLISHED_AT = new Date(Date.now() - 86_400_000).toISOString();

/** TEST SEED — remove when real picks flow. Arsenal vs Manchester City, predicted 1–1. */
export const TEST_SEED_PICK: Pick = {
  id: "test-seed-ars-mci",
  fixture_id: 0,
  league: "Premier League",
  kickoff_utc: KICKOFF_UTC,
  home_team: "Arsenal",
  away_team: "Manchester City",
  market: "other",
  selection: "Predicted 1–1",
  line: null,
  odds_publish: 6.5,
  odds_close: null,
  stake_units: 0.5,
  thesis:
    "North London's set-piece threat meets City's midfield control at the Emirates. " +
    "With both back lines missing a first-choice centre-back and neither side able to " +
    "press flat-out for 90 minutes, this shapes up as a tight, cagey game — the 1–1 " +
    "draw is the value read.",
  status: "published",
  published_at: PUBLISHED_AT,
  home_score: null,
  away_score: null,
  raw_outcome: null,
  units_pl: null,
  settled_at: null,
  publish_score_home: null,
  publish_score_away: null,
  home_id: null,
  away_id: null,
  sources: null,
  author: "curator",
  confidence: "high",
};

/** TEST SEED — remove when real picks flow. Predicted correct score for the hero scoreboard. */
export const TEST_SEED_PREDICTED = { home: 1, away: 1 } as const;
