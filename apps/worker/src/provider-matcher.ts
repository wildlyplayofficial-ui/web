/**
 * M2: Auto-match fixtures across odds-api and livescore providers.
 * Populates provider_mappings table. Runs on worker boot + periodically.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

const LS_BASE = 'https://livescore-api.com/api-client';

/** Normalize team name for matching across providers. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string> = {
  turkey: 'turkiye', turkiye: 'turkiye',
  'czech republic': 'czechia', czechia: 'czechia',
  'south korea': 'korea republic', 'korea republic': 'korea republic',
  usa: 'united states', 'united states': 'united states',
  'dr congo': 'congo dr', 'congo dr': 'congo dr',
  'ivory coast': 'cote d ivoire', 'cote d ivoire': 'cote d ivoire',
  'bosnia herzegovina': 'bosnia', 'bosnia and herzegovina': 'bosnia',
  curacao: 'curacao', 'curaçao': 'curacao',
};

function canonical(name: string): string {
  const n = normalize(name);
  return ALIASES[n] ?? n;
}

function teamsMatch(a: string, b: string): boolean {
  return canonical(a) === canonical(b);
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

interface Competition { id: string; livescore_id: number; odds_api_key: string }
interface OddsEvent { id: number; home: string; away: string; date: string }
interface LsFixture { id: string; fixture_id: string; home_name: string; away_name: string; date: string; time: string }

/** Fetch active competitions from DB. */
async function getActiveCompetitions(sb: SupabaseClient): Promise<Competition[]> {
  const { data } = await sb.from('competitions').select('id, livescore_id, odds_api_key').eq('status', 'active');
  return (data ?? []) as Competition[];
}

/** Fetch odds-api events for a competition. */
async function fetchOddsEvents(apiKey: string, league: string): Promise<OddsEvent[]> {
  try {
    const res = await fetch(`https://api.odds-api.io/v3/events?sport=football&league=${league}&apiKey=${apiKey}`);
    if (!res.ok) { log.warn(`provider-matcher: odds-api ${res.status} for ${league}`); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/** Fetch livescore fixtures for a date + competition. */
async function fetchLsFixtures(key: string, secret: string, compId: number, date: string): Promise<LsFixture[]> {
  try {
    const res = await fetch(`${LS_BASE}/fixtures/matches.json?key=${key}&secret=${secret}&competition_id=${compId}&date=${date}`);
    const data = await res.json();
    return data.success && data.data?.fixtures ? data.data.fixtures : [];
  } catch { return []; }
}

/** Run auto-matching for all active competitions. */
export async function runProviderMatcher(
  sb: SupabaseClient,
  oddsApiKey: string,
  lsKey: string,
  lsSecret: string,
): Promise<void> {
  const competitions = await getActiveCompetitions(sb);
  let total = 0;

  for (const comp of competitions) {
    if (!comp.odds_api_key || !comp.livescore_id) continue;

    const oddsEvents = await fetchOddsEvents(oddsApiKey, comp.odds_api_key);
    log.info(`provider-matcher: ${comp.id} — ${oddsEvents.length} odds events, fetching LS...`);
    if (oddsEvents.length === 0) continue;

    // Fetch LS fixtures for each unique date in odds events
    const dates = [...new Set(oddsEvents.map((e) => e.date.slice(0, 10)))];
    const lsFixtures: LsFixture[] = [];
    for (const d of dates.slice(0, 5)) { // limit to 5 dates to avoid rate limit
      lsFixtures.push(...await fetchLsFixtures(lsKey, lsSecret, comp.livescore_id, d));
    }

    // Match by team names + same day
    for (const odds of oddsEvents) {
      const ls = lsFixtures.find((f) =>
        teamsMatch(odds.home, f.home_name) &&
        teamsMatch(odds.away, f.away_name) &&
        sameDay(odds.date, `${f.date}T${f.time || '00:00'}Z`),
      );

      const slug = `${canonical(odds.home).replace(/\s+/g, '-')}-vs-${canonical(odds.away).replace(/\s+/g, '-')}-${odds.date.slice(0, 10)}`;

      await sb.from('provider_mappings').upsert({
        competition_id: comp.id,
        home_team: odds.home,
        away_team: odds.away,
        kickoff_utc: odds.date,
        odds_api_event_id: odds.id,
        livescore_match_id: ls ? String(ls.id || ls.fixture_id) : null,
        confidence: ls ? 'auto' : 'odds-only',
        slug,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'competition_id,home_team,away_team,kickoff_utc' });

      total++;
    }
  }

  if (total > 0) log.info(`provider-matcher: mapped ${total} fixture(s)`);
}
