/**
 * GoalLine cron helpers — match score sync from livescore API.
 * Used by /api/goalline/cron to update gl_matches before settlement.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { lsFetch } from "../ls-fetch";

const LIVESCORE_BASE = "https://livescore-api.com/api-client";
/** Default competition — will be read from competitions table in multi-league mode. */
export const WC_COMPETITION_ID = 362;

interface LivescoreFixture {
  id: string;
  fixture_id: string;
  status: string;
  ft_score?: string;
}

interface LivescoreMatch {
  id: number;
  fixture_id: number;
  score: string;
  ft_score: string;
  status: string;
}

interface MatchRow {
  id: string;
  external_match_id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_time_utc?: string;
}

export interface ScoreSyncResult {
  allFinished: boolean;
  hasVoidable: boolean;
  totalGoals: number;
}

function parseScore(score: string): { home: number; away: number } | null {
  if (!score || score === "? - ?") return null;
  const parts = score.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return null;
}

/** Fetch live matches from livescore. Returns fixture_id→match lookup. */
export async function fetchLiveMatchMap(
  lsKey: string,
  lsSecret: string,
  competitionId: number = WC_COMPETITION_ID,
): Promise<Map<string, LivescoreMatch>> {
  const res = await lsFetch(
    `${LIVESCORE_BASE}/scores/live.json?key=${lsKey}&secret=${lsSecret}&competition_id=${competitionId}`,
    { cache: "no-store" },
  );
  const data = await res.json() as { success: boolean; data?: { match?: LivescoreMatch[] } };
  const map = new Map<string, LivescoreMatch>();
  if (!data.success || !data.data?.match) return map;
  for (const m of data.data.match) {
    map.set(String(m.fixture_id || m.id), m);
    map.set(String(m.id), m);
  }
  return map;
}

/** Fetch fixtures for a given date. Returns fixture_id→fixture lookup. */
export async function fetchFixtureMap(
  lsKey: string,
  lsSecret: string,
  date: string,
  competitionId: number = WC_COMPETITION_ID,
): Promise<Map<string, LivescoreFixture>> {
  const res = await lsFetch(
    `${LIVESCORE_BASE}/fixtures/matches.json?key=${lsKey}&secret=${lsSecret}&competition_id=${competitionId}&date=${date}`,
    { cache: "no-store" },
  );
  const data = await res.json() as { success: boolean; data?: { fixtures?: LivescoreFixture[] } };
  const map = new Map<string, LivescoreFixture>();
  if (!data.success || !data.data?.fixtures) return map;
  for (const f of data.data.fixtures) {
    map.set(String(f.fixture_id || f.id), f);
    map.set(String(f.id || f.fixture_id), f);
  }
  return map;
}

/**
 * Sync scores for a set of db matches from livescore feeds.
 * Updates gl_matches rows and returns settlement readiness.
 */
export async function syncMatchScores(
  sb: SupabaseClient,
  dbMatches: MatchRow[],
  liveMap: Map<string, LivescoreMatch>,
  fixtureMap: Map<string, LivescoreFixture>,
): Promise<ScoreSyncResult> {
  let allFinished = true;
  let hasVoidable = false;

  for (const dbMatch of dbMatches) {
    const extId = String(dbMatch.external_match_id);
    const live = liveMap.get(extId);
    const fixture = fixtureMap.get(extId);

    let homeScore = dbMatch.home_score ?? 0;
    let awayScore = dbMatch.away_score ?? 0;
    let matchStatus = dbMatch.status;

    if (live) {
      const s = (live.status || "").toUpperCase();
      if (s === "FINISHED" || s === "FT") {
        const score = parseScore(live.ft_score || live.score);
        if (score) { homeScore = score.home; awayScore = score.away; }
        matchStatus = "finished";
      } else if (s === "POSTPONED") {
        matchStatus = "postponed"; hasVoidable = true;
      } else if (s === "ABANDONED") {
        matchStatus = "abandoned"; hasVoidable = true;
      } else {
        const score = parseScore(live.score);
        if (score) { homeScore = score.home; awayScore = score.away; }
        matchStatus = "live";
        allFinished = false;
      }
    } else if (fixture) {
      const s = (fixture.status || "").toUpperCase();
      if (s === "FINISHED" || s === "FT") {
        const score = parseScore(fixture.ft_score ?? "");
        if (score) { homeScore = score.home; awayScore = score.away; }
        matchStatus = "finished";
      } else if (s === "POSTPONED") {
        matchStatus = "postponed"; hasVoidable = true;
      } else if (s === "ABANDONED") {
        matchStatus = "abandoned"; hasVoidable = true;
      } else {
        allFinished = false;
      }
    } else {
      // Match not in live/fixture feed (livescore drops matches at HT/FT)
      if (dbMatch.status === "finished") {
        // Already reconciled — keep existing score
      } else if (dbMatch.kickoff_time_utc) {
        // Infer finished if kickoff was >3h ago (match duration ~2h + buffer)
        const hoursSinceKickoff = (Date.now() - new Date(dbMatch.kickoff_time_utc).getTime()) / 3_600_000;
        if (hoursSinceKickoff > 3) {
          matchStatus = "finished";
          // Keep last known scores — best we have when feed drops
        } else {
          allFinished = false;
        }
      } else {
        allFinished = false;
      }
    }

    await sb.from("gl_matches").update({
      home_score: homeScore,
      away_score: awayScore,
      valid_goals: homeScore + awayScore,
      status: matchStatus,
    }).eq("id", dbMatch.id);
  }

  // Re-fetch updated totals
  const { data: updated } = await sb
    .from("gl_matches")
    .select("valid_goals")
    .in("id", dbMatches.map((m) => m.id));

  const totalGoals = (updated as { valid_goals: number | null }[] | null)
    ?.reduce((sum, m) => sum + (m.valid_goals ?? 0), 0) ?? 0;

  return { allFinished, hasVoidable, totalGoals };
}
