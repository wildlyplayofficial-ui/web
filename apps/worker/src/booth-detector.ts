/**
 * Event detector for "The Booth" live commentary system.
 * Polls a match's events_url from the livescore API, diffs against
 * previously seen events, and returns NEW key events that should
 * trigger AI commentary. Never throws — returns [] on failure.
 */
import { log } from './log';

export type BoothEventType = 'goal' | 'goal_penalty' | 'own_goal' | 'red_card' | 'ht' | 'ft';

export interface BoothEvent {
  id: string;
  type: BoothEventType;
  minute: string;
  player: string | null;
  assist: string | null;
  homeAway: 'h' | 'a' | null;
  scoreAtEvent: { home: number; away: number };
  homeTeam: string;
  awayTeam: string;
}

/** Livescore API event types we care about. */
const EVENT_MAP: Record<string, BoothEventType> = {
  GOAL: 'goal',
  GOAL_PENALTY: 'goal_penalty',
  OWN_GOAL: 'own_goal',
  RED_CARD: 'red_card',
};

/** Parse "X - Y" score string into { home, away }. Returns 0-0 on failure. */
function parseScore(score: string | null | undefined): { home: number; away: number } {
  if (!score) return { home: 0, away: 0 };
  const parts = score.split('-').map((s) => parseInt(s.trim(), 10));
  const home = Number.isFinite(parts[0]) ? parts[0] : 0;
  const away = Number.isFinite(parts[1]) ? parts[1] : 0;
  return { home, away };
}

/** Derive a stable match id from the events URL for synthetic HT/FT ids. */
function matchIdFrom(eventsUrl: string): string {
  const match = eventsUrl.match(/(\d+)/);
  return match?.[1] ?? eventsUrl;
}

export async function detectNewEvents(
  eventsUrl: string,
  seenEventIds: Set<string>,
): Promise<BoothEvent[]> {
  try {
    const res = await fetch(eventsUrl, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      log.warn(`booth-detector: ${res.status} from ${eventsUrl}`);
      return [];
    }
    const body: any = await res.json();
    if (!body?.success || !body?.data?.match) {
      log.warn('booth-detector: unexpected payload shape');
      return [];
    }

    const m = body.data.match;
    const homeTeam: string = m.home_name ?? '';
    const awayTeam: string = m.away_name ?? '';
    const currentScore = parseScore(m.score);

    // --- Build running score from ALL goal events (sorted by minute) ---
    const rawEvents: any[] = Array.isArray(body.data.event) ? body.data.event : [];
    const goalTypes = new Set(['GOAL', 'GOAL_PENALTY', 'OWN_GOAL']);
    const allGoals = rawEvents
      .filter((ev: any) => goalTypes.has(ev.event))
      .sort((a: any, b: any) => parseInt(a.time, 10) - parseInt(b.time, 10));

    // For each event, compute score AFTER that event
    function scoreAfterEvent(ev: any): { home: number; away: number } {
      let h = 0, a = 0;
      for (const g of allGoals) {
        const isOwn = g.event === 'OWN_GOAL';
        if (g.home_away === 'h') { isOwn ? a++ : h++; }
        else { isOwn ? h++ : a++; }
        if (g.id === ev.id) break;
      }
      return { home: h, away: a };
    }

    // --- Key match events ---
    const events: BoothEvent[] = [];
    for (const ev of rawEvents) {
      const type = EVENT_MAP[ev.event];
      if (!type) continue;
      const isGoal = goalTypes.has(ev.event);
      const scoreAtEvent = isGoal ? scoreAfterEvent(ev) : currentScore;
      // Livescore event ids are NOT stable across polls (they rotate), so we
      // derive our own stable key: goals by resulting score, others by player.
      const id = isGoal
        ? `${type}:${scoreAtEvent.home}-${scoreAtEvent.away}`
        : `${type}:${ev.player ?? ev.time ?? ''}`;
      if (seenEventIds.has(id)) continue;
      events.push({
        id,
        type,
        minute: String(ev.time ?? ''),
        player: ev.player ?? null,
        assist: ev.info ?? null,
        homeAway: ev.home_away === 'h' || ev.home_away === 'a' ? ev.home_away : null,
        scoreAtEvent,
        homeTeam,
        awayTeam,
      });
    }

    // --- Synthetic HT / FT events ---
    const matchId = matchIdFrom(eventsUrl);
    const time = String(m.time ?? '').toUpperCase();
    const status = String(m.status ?? '').toUpperCase();

    const htId = `ht-${matchId}`;
    if (!seenEventIds.has(htId) && (m.ht_score || time === 'HT' || status === 'HT')) {
      events.push({
        id: htId,
        type: 'ht',
        minute: '45',
        player: null,
        assist: null,
        homeAway: null,
        scoreAtEvent: m.ht_score ? parseScore(m.ht_score) : currentScore,
        homeTeam,
        awayTeam,
      });
    }

    const ftId = `ft-${matchId}`;
    if (!seenEventIds.has(ftId) && (status === 'FINISHED' || time === 'FT')) {
      events.push({
        id: ftId,
        type: 'ft',
        minute: '90',
        player: null,
        assist: null,
        homeAway: null,
        scoreAtEvent: m.ft_score ? parseScore(m.ft_score) : currentScore,
        homeTeam,
        awayTeam,
      });
    }

    return events;
  } catch (err) {
    log.warn('booth-detector: fetch failed', err);
    return [];
  }
}
