/**
 * Finished WC fixtures — R0 Triage enrichment endpoint (Nick 4/7).
 * Closes a declared blind spot: the fatigue signal can't see matches older
 * than ~1 day on API-Football's free plan. We already fetch this data from
 * LiveScore for standings/knockout; this just reshapes it for R0 Triage.
 */
import { log } from './log';
import { lsFetch } from './ls-fetch';

const LIVESCORE_BASE = 'https://livescore-api.com/api-client';
const WC_COMPETITION_ID = 362;

export type FinishedStatus = 'FT' | 'AET' | 'PEN';

export interface FinishedFixture {
  home: string;
  away: string;
  ko_utc: string;
  score: string;
  status: FinishedStatus;
}

interface RawMatch {
  home: { name: string };
  away: { name: string };
  date: string;
  scheduled: string;
  time: string;
  scores: { ft_score: string };
}

/** LiveScore's `time` field on a finished match: FT | AET | AP (after penalties). */
function mapStatus(time: string): FinishedStatus | null {
  if (time === 'FT') return 'FT';
  if (time === 'AET') return 'AET';
  if (time === 'AP') return 'PEN';
  return null;
}

/** Pure mapper: raw LiveScore history matches → R0 Triage's finished-fixture shape. */
export function mapFinishedFixtures(matches: RawMatch[]): FinishedFixture[] {
  return matches.reduce<FinishedFixture[]>((out, m) => {
    const status = mapStatus(m.time);
    if (!status) return out;
    out.push({
      home: m.home.name,
      away: m.away.name,
      ko_utc: `${m.date}T${(m.scheduled || '00:00').slice(0, 5)}:00Z`,
      score: m.scores.ft_score.replace(/\s/g, ''),
      status,
    });
    return out;
  }, []);
}

/** Fetch finished WC matches from LiveScore for the last `days` days (default 10). */
export async function fetchFinishedFixtures(
  deps: { key: string; secret: string },
  days = 10,
): Promise<FinishedFixture[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  try {
    const res = await lsFetch(
      `${LIVESCORE_BASE}/matches/history.json?competition_id=${WC_COMPETITION_ID}&key=${deps.key}&secret=${deps.secret}&from=${from}&to=${to}`,
    );
    if (!res.ok) {
      log.warn(`finished-fixtures: livescore returned ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { success: boolean; data?: { match?: RawMatch[] } };
    if (!body.success || !body.data?.match) return [];
    return mapFinishedFixtures(body.data.match);
  } catch (err) {
    log.warn('finished-fixtures: fetch failed:', err);
    return [];
  }
}
