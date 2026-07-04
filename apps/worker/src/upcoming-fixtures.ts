/**
 * Upcoming WC fixtures — R0 Triage shadow-read companion (Nick 4/7, item ②).
 * Same shape as finished-fixtures, no score/status. R0 Triage uses this only
 * for a two-source KO-time diff against its own registry, not as a source
 * switch — see REQUEST_wc_fixtures_endpoints.md.
 */
import { log } from './log';

const LIVESCORE_BASE = 'https://livescore-api.com/api-client';
const WC_COMPETITION_ID = 362;

export interface UpcomingFixture {
  home: string;
  away: string;
  ko_utc: string;
}

interface RawFixture {
  home_name: string;
  away_name: string;
  date: string;
  time: string;
}

/** Pure mapper: raw LiveScore fixtures → R0 Triage's upcoming-fixture shape. */
export function mapUpcomingFixtures(fixtures: RawFixture[]): UpcomingFixture[] {
  return fixtures.map((f) => ({
    home: f.home_name,
    away: f.away_name,
    ko_utc: `${f.date}T${(f.time || '00:00:00').slice(0, 5)}:00Z`,
  }));
}

/** Fetch upcoming WC matches from LiveScore for the next `days` days (default 14).
 *  LiveScore's fixtures endpoint only takes a single `date` per call on our plan
 *  (no date-range query), so we fan out one request per day. */
export async function fetchUpcomingFixtures(
  deps: { key: string; secret: string },
  days = 14,
): Promise<UpcomingFixture[]> {
  const dates = Array.from({ length: days }, (_, i) =>
    new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
  );
  try {
    const results = await Promise.all(
      dates.map((date) =>
        fetch(
          `${LIVESCORE_BASE}/fixtures/matches.json?competition_id=${WC_COMPETITION_ID}&key=${deps.key}&secret=${deps.secret}&date=${date}`,
        )
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ),
    );
    const fixtures: RawFixture[] = [];
    for (const body of results as { success: boolean; data?: { fixtures?: RawFixture[] } }[]) {
      if (body?.success && body.data?.fixtures) fixtures.push(...body.data.fixtures);
    }
    return mapUpcomingFixtures(fixtures);
  } catch (err) {
    log.warn('upcoming-fixtures: fetch failed:', err);
    return [];
  }
}
