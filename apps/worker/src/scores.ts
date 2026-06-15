/** Final-score fetcher for odds-api.io. One job: event id → final score (or null). */
import type { Score } from '@wildlyplay/settlement';
import { log } from './log';

const FINISHED = new Set(['finished', 'ended', 'settled']);
const IN_PROGRESS = new Set(['not_started', 'scheduled', 'upcoming', 'pending', 'live', 'in_play', 'inplay']);

/** Returns the final score, or null if the event is not finished yet. Throws on HTTP errors. */
export async function getFinalScore(eventId: number, apiKey: string): Promise<Score | null> {
  const res = await fetch(`https://api.odds-api.io/v3/events/${eventId}?apiKey=${apiKey}`);
  if (!res.ok) throw new Error(`odds-api returned ${res.status} for event ${eventId}`);
  const body: any = await res.json();

  const status = String(body?.status ?? body?.event?.status ?? '').toLowerCase();
  if (!FINISHED.has(status)) {
    if (!IN_PROGRESS.has(status)) {
      // Defensive: unknown status values get logged loudly with the raw payload.
      log.warn(`odds-api event ${eventId}: unknown status "${status}"`, JSON.stringify(body).slice(0, 400));
    }
    return null;
  }

  const home = toInt(body?.scores?.home ?? body?.score?.home ?? body?.home_score);
  const away = toInt(body?.scores?.away ?? body?.score?.away ?? body?.away_score);
  if (home === null || away === null) {
    log.warn(`odds-api event ${eventId}: finished but score unreadable`, JSON.stringify(body).slice(0, 400));
    return null;
  }
  return { home, away };
}

function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && value !== null && value !== undefined && value !== '' ? n : null;
}
