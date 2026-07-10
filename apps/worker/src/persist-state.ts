/** R3: Persist live match state to Supabase (fallback when livescore-api drops FT matches). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

export interface LiveMatchData {
  id: string; home_team: string; away_team: string;
  home_score: number | null; away_score: number | null;
  minute: number | null; status: string; period: string | null;
  kickoff_utc: string; competition: string; events_url: string | null;
}

const SR: Record<string, number> = { upcoming: 0, live: 1, finished: 2 };

/** Upsert matches into match_live_state. Never throws. */
export async function persistMatchState(supabase: SupabaseClient, matches: LiveMatchData[]): Promise<void> {
  if (matches.length === 0) return;
  try {
    const { data: existing } = await supabase
      .from('match_live_state').select('id, status, home_score').in('id', matches.map((m) => m.id));
    const ex = new Map(((existing ?? []) as { id: string; status: string; home_score: number | null }[]).map((r) => [r.id, r]));
    const rows: Array<Record<string, unknown>> = [];
    for (const m of matches) {
      const e = ex.get(m.id);
      if (e) {
        const iR = SR[m.status] ?? 0, eR = SR[e.status] ?? 0;
        if (iR < eR || (iR === eR && m.home_score == null)) continue;
      }
      rows.push({
        id: m.id, home_team: m.home_team, away_team: m.away_team,
        home_score: m.home_score, away_score: m.away_score,
        minute: m.minute, status: m.status, period: m.period,
        kickoff_utc: m.kickoff_utc, competition: m.competition,
        events_url: m.events_url, updated_at: new Date().toISOString(),
      });
    }
    if (rows.length === 0) return;
    const { error } = await supabase.from('match_live_state').upsert(rows, { onConflict: 'id' });
    if (error) { log.warn('persist-state upsert error:', error.message); return; }
    log.info(`persist-state: upserted ${rows.length}/${matches.length} match(es)`);
  } catch (err) { log.warn('persist-state failed:', err); }
}

const LS = 'https://livescore-api.com/api-client';
const CID = 362;

function parseScore(s: string): { home: number; away: number } | null {
  if (!s || s === '? - ?') return null;
  const p = s.split('-').map((x: string) => parseInt(x.trim(), 10));
  return p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) ? { home: p[0], away: p[1] } : null;
}

function status(s: string): 'finished' | 'live' | 'upcoming' {
  const u = s.toUpperCase();
  if (u === 'FINISHED' || u === 'FT') return 'finished';
  if (u === 'IN PLAY' || u === 'LIVE' || u === 'HT' || u === 'HALF TIME') return 'live';
  return 'upcoming';
}

/** Seed match_live_state from gl_matches (covers finished matches that livescore dropped). */
export async function seedFromGlMatches(supabase: SupabaseClient): Promise<void> {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('gl_matches')
      .select('external_match_id, home_team, away_team, home_score, away_score, status, kickoff_time_utc')
      .gte('kickoff_time_utc', twoDaysAgo);
    if (!data?.length) return;

    const rows = (data as { external_match_id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; status: string; kickoff_time_utc: string }[])
      .filter((m) => m.external_match_id && m.external_match_id !== '0')
      .map((m) => ({
        id: m.external_match_id, home_team: m.home_team, away_team: m.away_team,
        home_score: m.home_score, away_score: m.away_score,
        minute: null, status: m.status === 'finished' ? 'finished' : m.status === 'live' ? 'live' : 'upcoming',
        period: null, kickoff_utc: m.kickoff_time_utc,
        competition: 'FIFA World Cup', events_url: null,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      await supabase.from('match_live_state').upsert(rows, { onConflict: 'id' });
      log.info(`persist-state: seeded ${rows.length} match(es) from gl_matches`);
    }
  } catch (err) { log.warn('persist-state seed failed:', err); }
}

/**
 * Detect matches stuck as "live" that should be "finished".
 * Requires 3 CONSECUTIVE absences from the live feed before marking FT.
 * This prevents false positives from feed blips or delayed second halves.
 * Knockout-safe: 140 min threshold (covers 90' + 30' ET + 15' penalties + 5' buffer).
 */
const absentCounts = new Map<string, number>();
const ABSENT_THRESHOLD = 3; // 3 consecutive polls
const FT_THRESHOLD_MS = 140 * 60_000; // 140 min — safe for knockout (ET + penalties)

export async function detectFinishedMatches(
  supabase: SupabaseClient,
  currentFeedIds: Set<string>,
): Promise<void> {
  try {
    const { data: liveEntries } = await supabase
      .from('match_live_state')
      .select('id, home_team, away_team, home_score, away_score, kickoff_utc, minute')
      .eq('status', 'live');
    if (!liveEntries?.length) { absentCounts.clear(); return; }

    const now = Date.now();

    for (const entry of liveEntries as { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; kickoff_utc: string; minute: number | null }[]) {
      if (currentFeedIds.has(entry.id)) {
        absentCounts.delete(entry.id); // back in feed, reset counter
        continue;
      }
      const kickoff = new Date(entry.kickoff_utc).getTime();
      if (isNaN(kickoff) || now - kickoff < FT_THRESHOLD_MS) continue;

      const count = (absentCounts.get(entry.id) ?? 0) + 1;
      absentCounts.set(entry.id, count);

      if (count < ABSENT_THRESHOLD) {
        log.info(`persist-state: ${entry.home_team} vs ${entry.away_team} absent ${count}/${ABSENT_THRESHOLD} (not marking FT yet)`);
        continue;
      }

      // 3+ consecutive absences + past threshold → mark finished
      await supabase.from('match_live_state')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      absentCounts.delete(entry.id);
      log.info(`persist-state: auto-FT ${entry.home_team} vs ${entry.away_team} (absent ${count} polls, kickoff+115m passed)`);
    }
  } catch (err) { log.warn('persist-state detectFinished failed:', err); }
}

/** Fetch today (+ yesterday if early UTC) fixtures from livescore-api.
 *  Quota optimization: skip yesterday fetch after 06:00 UTC (matches from
 *  yesterday are settled by then). Saves 1 API call per tick = ~33% reduction. */
export async function fetchLivescoreForPersist(env: NodeJS.ProcessEnv): Promise<LiveMatchData[]> {
  const key = env.LIVESCORE_API_KEY, secret = env.LIVESCORE_API_SECRET;
  if (!key || !secret) return [];
  const now = new Date(), today = now.toISOString().slice(0, 10);
  const q = `key=${key}&secret=${secret}&competition_id=${CID}`;
  // Only fetch yesterday before 06:00 UTC (late matches may still be finishing)
  const needYesterday = now.getUTCHours() < 6;
  try {
    const fetches: Promise<Response>[] = [
      fetch(`${LS}/fixtures/matches.json?${q}&date=${today}`),
      fetch(`${LS}/scores/live.json?${q}`),
    ];
    if (needYesterday) {
      const yday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
      fetches.push(fetch(`${LS}/fixtures/matches.json?${q}&date=${yday}`));
    }
    const responses = await Promise.all(fetches);
    const [tD, lD, ...rest] = await Promise.all(responses.map(r => r.json()));
    const yD = rest[0] ?? { success: false };
    const liveMap = new Map<string, { score: string; time: string; status: string }>();
    if (lD.success && lD.data?.match)
      for (const m of lD.data.match) liveMap.set(String(m.fixture_id || m.id), m);
    const fixtures = [
      ...(tD.success && tD.data?.fixtures ? tD.data.fixtures : []),
      ...(yD.success && yD.data?.fixtures ? yD.data.fixtures : []),
    ];
    const results: LiveMatchData[] = [], seen = new Set<string>();
    for (const f of fixtures) {
      const id = String(f.id || f.fixture_id);
      if (seen.has(id)) continue; seen.add(id);
      const live = liveMap.get(String(f.fixture_id || f.id));
      const sc = parseScore(live?.score ?? f.ft_score ?? f.score);
      const st = status(live?.status ?? f.status ?? '');
      const u = (live?.status ?? f.status ?? '').toUpperCase();
      results.push({
        id, home_team: f.home_name, away_team: f.away_name,
        home_score: sc?.home ?? null, away_score: sc?.away ?? null,
        minute: live ? parseInt(live.time, 10) || null : null, status: st,
        period: st === 'live' && (u === 'HT' || u === 'HALF TIME') ? 'HT' : null,
        kickoff_utc: f.date && f.time ? `${f.date}T${f.time}Z` : '',
        competition: f.competition_name || 'FIFA World Cup', events_url: f.events || null,
      });
    }
    // Also include live matches NOT in fixtures (same fix as homepage getTodaysMatches)
    if (lD.success && lD.data?.match) {
      for (const m of lD.data.match as Array<Record<string, string>>) {
        const fid = String(m.fixture_id || m.id);
        const mid = String(m.id || m.fixture_id);
        if (seen.has(fid) || seen.has(mid)) continue;
        seen.add(fid); seen.add(mid);
        const sc = parseScore(m.score);
        const kickoff = m.scheduled && m.added
          ? (() => {
              const dateStr = m.added.slice(0, 10);
              const addedTime = m.added.slice(11, 16);
              const needsNext = m.scheduled < addedTime;
              const base = new Date(`${dateStr}T00:00:00Z`);
              if (needsNext) base.setUTCDate(base.getUTCDate() + 1);
              return `${base.toISOString().slice(0, 10)}T${m.scheduled}:00Z`;
            })()
          : '';
        results.push({
          id: fid, home_team: m.home_name, away_team: m.away_name,
          home_score: sc?.home ?? null, away_score: sc?.away ?? null,
          minute: parseInt(m.time, 10) || null, status: status(m.status || ''),
          period: m.status?.toUpperCase() === 'HT' ? 'HT' : null,
          kickoff_utc: kickoff, competition: m.competition_name || 'FIFA World Cup',
          events_url: m.events || null,
        });
      }
    }
    return results;
  } catch (err) { log.warn('persist-state fetch failed:', err); return []; }
}
