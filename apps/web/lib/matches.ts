import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import { MAX_LIVE_MS } from "./match-constants";

/**
 * Fetch today's matches from livescore-api.com.
 * Strategy: fixtures endpoint is the source of truth for match list + scores.
 * Live endpoint supplements with real-time minute for live matches.
 * This way matches never vanish at HT/FT — fixtures always returns them.
 */

const LIVESCORE_BASE = "https://livescore-api.com/api-client";

export type MatchStatus = "upcoming" | "live" | "finished";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  competition: string;
  eventsUrl: string | null;
}

interface LivescoreFixture {
  id: string;
  fixture_id: string;
  home_name: string;
  away_name: string;
  date: string;
  time: string;
  scheduled: string;
  status: string;
  score: string;
  ht_score: string;
  ft_score: string;
  competition_name: string;
  competition_id: number;
  events: string;
  has_lineups: boolean;
}

interface LivescoreMatch {
  id: number;
  fixture_id: number;
  home_name: string;
  away_name: string;
  score: string;
  time: string;
  scheduled: string;
  status: string;
  ht_score: string;
  ft_score: string;
  competition_name: string;
  competition_id: number;
  events: string;
  has_lineups: boolean;
  added: string;
  last_changed: string;
}

function parseScore(score: string): { home: number; away: number } | null {
  if (!score || score === "? - ?") return null;
  const parts = score.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { home: parts[0], away: parts[1] };
  }
  return null;
}

function parseMinute(time: string): number | null {
  const m = parseInt(time, 10);
  return isNaN(m) ? null : m;
}

function getApiCredentials(): { key: string; secret: string } | null {
  const key = process.env.LIVESCORE_API_KEY;
  const secret = process.env.LIVESCORE_API_SECRET;
  if (!key || !secret) return null;
  return { key, secret };
}

const WC_COMPETITION_ID = 362;
const WINDOW_MS = 6 * 60 * 60 * 1000;

function deriveStatus(f: LivescoreFixture, now: Date): MatchStatus {
  const s = (f.status || "").toUpperCase();
  if (s === "FINISHED" || s === "FT") return "finished";
  if (s === "IN PLAY" || s === "LIVE" || s === "HT" || s === "HALF TIME") {
    // Stale-live guard: even an explicit LIVE status string is finished if it
    // kicked off longer ago than any match can run.
    if (f.date && f.time && now.getTime() - new Date(`${f.date}T${f.time}Z`).getTime() > MAX_LIVE_MS) {
      return "finished";
    }
    return "live";
  }
  // Only derive "live" from kickoff time when there's a real score (not "? - ?").
  // Without this guard, timezone drift or API delay can show "live" before actual kickoff.
  if (f.date && f.time) {
    const kickoff = new Date(`${f.date}T${f.time}Z`);
    const hasScore = f.score && f.score !== "? - ?" && f.score !== "";
    if (kickoff <= now && hasScore) {
      // Same stale-live guard as the live-feed branch: a scored match kicked
      // off longer ago than any match can run is finished, not live.
      if (now.getTime() - kickoff.getTime() > MAX_LIVE_MS) return "finished";
      return "live";
    }
  }
  return "upcoming";
}

async function fetchTodaysMatchesImpl(): Promise<Match[]> {
  const creds = getApiCredentials();
  if (!creds) return [];

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  try {
    // Fixtures = source of truth for match list (always returns all matches for the day)
    const fixturesUrl = `${LIVESCORE_BASE}/fixtures/matches.json?key=${creds.key}&secret=${creds.secret}&competition_id=${WC_COMPETITION_ID}&date=${today}`;
    const yesterdayUrl = `${LIVESCORE_BASE}/fixtures/matches.json?key=${creds.key}&secret=${creds.secret}&competition_id=${WC_COMPETITION_ID}&date=${yesterday}`;
    // Live = supplements with real-time minute/score
    const liveUrl = `${LIVESCORE_BASE}/scores/live.json?key=${creds.key}&secret=${creds.secret}&competition_id=${WC_COMPETITION_ID}`;

    const [fixturesRes, yesterdayRes, liveRes] = await Promise.all([
      fetch(fixturesUrl, { cache: "no-store" }),
      fetch(yesterdayUrl, { cache: "no-store" }),
      fetch(liveUrl, { cache: "no-store" }),
    ]);

    const fixturesData = await fixturesRes.json();
    const yesterdayData = await yesterdayRes.json();
    const liveData = await liveRes.json();

    // Build live match lookup by fixture_id for real-time data
    const liveMap = new Map<string, LivescoreMatch>();
    if (liveData.success && liveData.data?.match) {
      for (const m of liveData.data.match as LivescoreMatch[]) {
        liveMap.set(String(m.fixture_id || m.id), m);
        liveMap.set(String(m.id), m);
      }
    }

    // Process all fixtures (today + yesterday)
    const allFixtures = [
      ...(fixturesData.success && fixturesData.data?.fixtures ? fixturesData.data.fixtures : []),
      ...(yesterdayData.success && yesterdayData.data?.fixtures ? yesterdayData.data.fixtures : []),
    ];

    const matches: Match[] = [];
    const seenIds = new Set<string>();

    for (const f of allFixtures as LivescoreFixture[]) {
      const fixtureId = String(f.fixture_id || f.id);
      const id = String(f.id || f.fixture_id);
      if (seenIds.has(fixtureId) || seenIds.has(id)) continue;
      seenIds.add(fixtureId);
      seenIds.add(id);

      // Check if we have live data for this match
      const live = liveMap.get(fixtureId) || liveMap.get(id);

      const kickoffUtc = f.date && f.time ? `${f.date}T${f.time}Z` : "";

      if (live) {
        // Match is in live feed — but API sometimes adds matches early (before actual kickoff).
        // Guard: only treat as live if kickoff has actually passed.
        const score = parseScore(live.score);
        // Stale-live guard: the live feed sometimes keeps a finished match at
        // minute 90 with a non-FT status, which would show "live" forever.
        // If kickoff was longer ago than a match can possibly run, force finished.
        const kickoffMs = kickoffUtc ? new Date(kickoffUtc).getTime() : 0;
        const staleLive = kickoffMs > 0 && now.getTime() - kickoffMs > MAX_LIVE_MS;
        const isFinished = live.status === "FINISHED" || live.status === "FT" || staleLive;
        const kickoffPassed = kickoffUtc ? new Date(kickoffUtc) <= now : true;
        const actuallyLive = kickoffPassed && !isFinished;
        matches.push({
          id,
          homeTeam: live.home_name || f.home_name,
          awayTeam: live.away_name || f.away_name,
          kickoffUtc,
          status: isFinished ? "finished" : actuallyLive ? "live" : "upcoming",
          minute: actuallyLive ? parseMinute(live.time) : null,
          homeScore: actuallyLive || isFinished ? (score?.home ?? null) : null,
          awayScore: actuallyLive || isFinished ? (score?.away ?? null) : null,
          competition: f.competition_name || "FIFA World Cup",
          eventsUrl: live.events || f.events || null,
        });
      } else {
        // Not in live feed — use fixture data + derive status
        const fixtureStatus = deriveStatus(f, now);
        const score = parseScore(f.ft_score || f.score);
        matches.push({
          id,
          homeTeam: f.home_name,
          awayTeam: f.away_name,
          kickoffUtc,
          status: fixtureStatus,
          minute: null,
          homeScore: score?.home ?? null,
          awayScore: score?.away ?? null,
          competition: f.competition_name || "FIFA World Cup",
          eventsUrl: f.events || null,
        });
      }
    }

    // Also add any live matches not in fixtures (edge case)
    if (liveData.success && liveData.data?.match) {
      for (const m of liveData.data.match as LivescoreMatch[]) {
        const fixtureId = String(m.fixture_id || m.id);
        const id = String(m.id || m.fixture_id);
        if (seenIds.has(fixtureId) || seenIds.has(id)) continue;
        seenIds.add(fixtureId);
        seenIds.add(id);
        const score = parseScore(m.score);
        // scheduled may be time-only ("01:00"), added has full datetime ("2026-06-17 00:45:36")
        let kickoffUtc = "";
        if (m.added) {
          try {
            const addedIso = m.added.includes("T") ? m.added : m.added.replace(" ", "T") + "Z";
            // If scheduled has time, use added's date + scheduled time
            // Handle midnight crossover: if scheduled time < added time, kickoff is next day
            if (m.scheduled && /^\d{2}:\d{2}/.test(m.scheduled)) {
              const dateStr = m.added.slice(0, 10); // YYYY-MM-DD from added
              const addedTime = m.added.slice(11, 16); // HH:MM from added
              const needsNextDay = m.scheduled < addedTime; // e.g. scheduled 00:00 < added 23:45
              const baseDate = new Date(`${dateStr}T00:00:00Z`);
              if (needsNextDay) baseDate.setUTCDate(baseDate.getUTCDate() + 1);
              kickoffUtc = new Date(`${baseDate.toISOString().slice(0, 10)}T${m.scheduled}Z`).toISOString();
            } else {
              kickoffUtc = new Date(addedIso).toISOString();
            }
          } catch { /* empty */ }
        }
        // Stale-live guard (same as fixtures block): a finished match kept at
        // minute 90 with a non-FT status would otherwise show "live" forever.
        const kickoffMs = kickoffUtc ? new Date(kickoffUtc).getTime() : 0;
        const staleLive = kickoffMs > 0 && now.getTime() - kickoffMs > MAX_LIVE_MS;
        const isFinished = m.status === "FINISHED" || m.status === "FT" || staleLive;
        matches.push({
          id,
          homeTeam: m.home_name,
          awayTeam: m.away_name,
          kickoffUtc,
          status: isFinished ? "finished" : "live",
          minute: isFinished ? null : parseMinute(m.time),
          homeScore: score?.home ?? null,
          awayScore: score?.away ?? null,
          competition: m.competition_name || "FIFA World Cup",
          eventsUrl: m.events || null,
        });
      }
    }

    // R3 fallback: fill gaps from persisted match state (Supabase)
    // Use start-of-day (UTC) as lower bound to include early morning matches
    const fallbackStart = new Date(now);
    fallbackStart.setUTCHours(0, 0, 0, 0);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: persisted } = await supabase
          .from("match_live_state")
          .select("*")
          .gte("kickoff_utc", fallbackStart.toISOString())
          .lte("kickoff_utc", new Date(now.getTime() + WINDOW_MS).toISOString());
        if (persisted) {
          for (const p of persisted) {
            if (seenIds.has(String(p.id))) continue;
            seenIds.add(String(p.id));
            // Stale-live guard: persisted state can also be stuck at "live".
            const koMs = p.kickoff_utc ? new Date(p.kickoff_utc).getTime() : 0;
            const staleLive = koMs > 0 && now.getTime() - koMs > MAX_LIVE_MS;
            const st: MatchStatus = staleLive
              ? "finished"
              : p.status === "finished" ? "finished" : p.status === "live" ? "live" : "upcoming";
            matches.push({
              id: String(p.id),
              homeTeam: p.home_team,
              awayTeam: p.away_team,
              kickoffUtc: p.kickoff_utc ?? "",
              status: st,
              minute: st === "live" ? (p.minute ?? null) : null,
              homeScore: p.home_score ?? null,
              awayScore: p.away_score ?? null,
              competition: p.competition || "FIFA World Cup",
              eventsUrl: p.events_url ?? null,
            });
          }
        }
      } catch { /* fallback is best-effort */ }
    }

    // Rolling window: show matches from start of today (UTC) or (now - 6h), whichever is earlier
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const effectiveStart = todayStart < windowStart ? todayStart : windowStart;
    const filtered = matches.filter((m) => {
      if (!m.kickoffUtc) return true; // keep matches without kickoff (don't drop)
      const kickoff = new Date(m.kickoffUtc);
      return kickoff >= effectiveStart;
    });

    return filtered.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  } catch {
    return [];
  }
}

export const getTodaysMatches = unstable_cache(
  fetchTodaysMatchesImpl,
  ["todays-matches"],
  { revalidate: 300, tags: ["matches"] },
);

/** Normalize team name for dedup: lowercase, strip diacritics + punctuation, & → and. */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Team name aliases: livescore vs odds-api use different names. */
const TEAM_ALIASES: Record<string, string> = {
  turkey: "turkiye",
  turkiye: "turkiye",
  "czech republic": "czechia",
  czechia: "czechia",
  "south korea": "korea republic",
  "korea republic": "korea republic",
  usa: "united states",
  "united states": "united states",
  "dr congo": "congo dr",
  "congo dr": "congo dr",
  "ivory coast": "cote d ivoire",
  "cote d ivoire": "cote d ivoire",
  "bosnia herzegovina": "bosnia",
  "bosnia and herzegovina": "bosnia",
};

/** Canonical form for dedup comparison. */
function canonicalTeam(name: string): string {
  const norm = normalizeTeam(name);
  return TEAM_ALIASES[norm] ?? norm;
}

/** Check if two team names refer to the same team. */
function teamsEqual(a: string, b: string): boolean {
  return canonicalTeam(a) === canonicalTeam(b);
}

/** Fetch picks that are likely live from Supabase (published + kickoff passed + not settled). */
async function fetchLivePicksFromDb(): Promise<Match[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("picks")
      .select("id, home_team, away_team, kickoff_utc, league")
      .eq("status", "published")
      .lte("kickoff_utc", now.toISOString())
      .gte("kickoff_utc", threeHoursAgo.toISOString());

    if (error || !data) return [];

    // Enrich with live scores from match_live_state + exclude finished matches
    const { data: liveStates } = await supabase
      .from("match_live_state")
      .select("home_team, away_team, home_score, away_score, minute, status")
      .in("status", ["live"]);

    const liveMap = new Map<string, { home_score: number; away_score: number; minute: number | null }>();
    const finishedSet = new Set<string>();
    for (const ls of (liveStates ?? []) as { home_team: string; away_team: string; home_score: number; away_score: number; minute: number | null; status: string }[]) {
      const key = `${ls.home_team.toLowerCase()}|${ls.away_team.toLowerCase()}`;
      if (ls.status === "live") liveMap.set(key, ls);
    }

    // Also check finished to exclude
    const { data: finStates } = await supabase
      .from("match_live_state")
      .select("home_team, away_team")
      .eq("status", "finished")
      .gte("kickoff_utc", threeHoursAgo.toISOString());
    for (const fs of (finStates ?? []) as { home_team: string; away_team: string }[]) {
      finishedSet.add(`${fs.home_team.toLowerCase()}|${fs.away_team.toLowerCase()}`);
    }

    return data
      .filter((p) => !finishedSet.has(`${p.home_team.toLowerCase()}|${p.away_team.toLowerCase()}`))
      .map((p) => {
        const key = `${p.home_team.toLowerCase()}|${p.away_team.toLowerCase()}`;
        const live = liveMap.get(key);
        return {
          id: `pick-${p.id}`,
          homeTeam: p.home_team,
          awayTeam: p.away_team,
          kickoffUtc: p.kickoff_utc,
          status: "live" as MatchStatus,
          minute: live?.minute ?? null,
          homeScore: live?.home_score ?? null,
          awayScore: live?.away_score ?? null,
          competition: p.league || "FIFA World Cup",
          eventsUrl: null,
        };
      });
  } catch {
    return [];
  }
}

/** Fetch only live matches (for the ticker). Not cached.
 *  Merges livescore-api data with Supabase picks fallback to cover feed gaps. */
export async function fetchLiveMatches(): Promise<Match[]> {
  const [all, dbLive] = await Promise.all([
    fetchTodaysMatchesImpl(),
    fetchLivePicksFromDb(),
  ]);

  const liveFromApi = all.filter((m) => m.status === "live");

  // Merge: add DB picks that aren't already in livescore results (dedup by team names)
  for (const pick of dbLive) {
    const alreadyInApi = liveFromApi.some(
      (m) => teamsEqual(m.homeTeam, pick.homeTeam) && teamsEqual(m.awayTeam, pick.awayTeam),
    );
    if (!alreadyInApi) {
      liveFromApi.push(pick);
    }
  }

  return liveFromApi;
}
