/**
 * Auto-attach the odds-api.io event id at /pick time (Nick 12/6: "bot nên tự
 * gắn event id"). Picks are immutable after publish, so the id MUST be found
 * before insert. Conservative by design: attach only when the lookup matches
 * EXACTLY ONE event — ambiguity or any failure → null, the pick publishes with
 * fixture_id 0 and the Curator settles manually. Never throws, never blocks.
 */
import { log } from './log';

/** Default lookup league — WC season, site is WC-focused. Change here when the season rolls over. */
export const LOOKUP_LEAGUE = 'international-fifa-world-cup';

/** How long the lookup may delay the confirmation reply before we give up. */
const LOOKUP_TIMEOUT_MS = 5_000;

/** Shape of one event in the odds-api.io /v3/events payload (fields we use). */
export interface ApiEvent {
  id: number;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  date: string; // ISO, e.g. "2026-06-12T19:00:00Z"
}

export interface MatchQuery {
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string; // ISO 8601
}

/** Result from event lookup — includes participant IDs for team logos (13/6). */
export interface EventMatch {
  id: number;
  homeId: number | null;
  awayId: number | null;
}

/** Lowercase, "&" → "and", strip diacritics + punctuation, collapse whitespace. */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Equal after normalization, or one contains the other ("Bosnia" ↔ "Bosnia and Herzegovina"). */
function teamMatches(apiName: string, inputName: string): boolean {
  const a = normalizeTeam(apiName);
  const b = normalizeTeam(inputName);
  if (a === '' || b === '') return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Same UTC calendar date — the Curator may type the kickoff hour slightly off. */
function sameUtcDate(eventDate: string, kickoffUtc: string): boolean {
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === kickoffUtc.slice(0, 10);
}

/**
 * Pure matcher: events list + pick info → event id, or null. Both teams must
 * match in home/away order AND the kickoff must fall on the same UTC date.
 * Returns the id only when EXACTLY one event matches (0 or 2+ → null).
 */
export function matchEvent(events: ApiEvent[], query: MatchQuery): number | null {
  const event = matchEventFull(events, query);
  return event?.id ?? null;
}

/** Like matchEvent but returns the full EventMatch including participant IDs (13/6: team logos). */
export function matchEventFull(events: ApiEvent[], query: MatchQuery): EventMatch | null {
  // Match teams in either order — odds-api home/away may differ from betting sites (Nick 13/6).
  const candidates = events.filter((e) =>
    ((teamMatches(e.home, query.homeTeam) && teamMatches(e.away, query.awayTeam)) ||
     (teamMatches(e.home, query.awayTeam) && teamMatches(e.away, query.homeTeam))) &&
    sameUtcDate(e.date, query.kickoffUtc),
  );
  if (candidates.length !== 1) return null;
  const e = candidates[0];
  return { id: e.id, homeId: e.homeId ?? null, awayId: e.awayId ?? null };
}

/**
 * Fetch the events list and find the unique match. Any HTTP/parse/timeout
 * error → log.warn + null. Never throws — a lookup failure must never block
 * pick publication.
 *
 * Returns the full EventMatch (id + participant IDs for team logos) since 13/6.
 */
export async function findEvent(
  deps: { apiKey: string },
  pick: MatchQuery,
): Promise<EventMatch | null> {
  try {
    const res = await fetch(
      `https://api.odds-api.io/v3/events?sport=football&league=${LOOKUP_LEAGUE}&apiKey=${deps.apiKey}`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    );
    if (!res.ok) {
      log.warn(`event lookup: odds-api returned ${res.status} for league ${LOOKUP_LEAGUE}`);
      return null;
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) {
      log.warn('event lookup: unexpected payload (not an array)');
      return null;
    }
    const event = matchEventFull(body as ApiEvent[], pick);
    if (event === null) {
      log.warn(`event lookup: no unambiguous event for ${pick.homeTeam} vs ${pick.awayTeam} on ${pick.kickoffUtc.slice(0, 10)}`);
    }
    return event;
  } catch (err) {
    log.warn(`event lookup failed for ${pick.homeTeam} vs ${pick.awayTeam}:`, err);
    return null;
  }
}

/** @deprecated Use findEvent() which returns full EventMatch with participant IDs. */
export async function findEventId(
  deps: { apiKey: string },
  pick: MatchQuery,
): Promise<number | null> {
  const event = await findEvent(deps, pick);
  return event?.id ?? null;
}
