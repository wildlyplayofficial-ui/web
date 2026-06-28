/** 90-minute score fetcher for odds-api.io. Extracts regulation score, skips ET/penalties.
 * One job: event id → 90-min score (or null).
 * KO rounds pick 90 min only, so settle MUST use regulation score (periods["ft"]), not final.
 */
import type { Score } from '@wildlyplay/settlement';
import { log } from './log';

const FINISHED = new Set(['finished', 'ended', 'settled']);
const IN_PROGRESS = new Set(['not_started', 'scheduled', 'upcoming', 'pending', 'live', 'in_play', 'inplay']);

/** Returns the 90-minute regulation score, or null if the event is not finished yet.
 * For KO rounds, regulation = 90 min (periods["ft"]), ignoring ET/penalty goals.
 * Throws on HTTP errors. */
export async function getFinalScore(eventId: number, apiKey: string): Promise<Score | null> {
  const res = await fetch(`https://api.odds-api.io/v3/events/${eventId}?apiKey=${apiKey}`);
  if (!res.ok) throw new Error(`odds-api returned ${res.status} for event ${eventId}`);
  const body: any = await res.json();

  const status = String(body?.status ?? body?.event?.status ?? '').toLowerCase();
  if (!FINISHED.has(status)) {
    if (!IN_PROGRESS.has(status)) {
      log.warn(`odds-api event ${eventId}: unknown status "${status}"`, JSON.stringify(body).slice(0, 400));
    }
    return null;
  }

  // Priority: use periods["ft"] (90-min regulation). If missing, fallback to top-level + warn.
  // This ensures picks for KO rounds settle on 90 min, not ET/penalties.
  let home = toInt(body?.periods?.ft?.home);
  let away = toInt(body?.periods?.ft?.away);

  if (home === null || away === null) {
    // Fallback if periods["ft"] missing (should not happen for finished events, but defensive).
    const topHome = toInt(body?.scores?.home ?? body?.score?.home ?? body?.home_score);
    const topAway = toInt(body?.scores?.away ?? body?.score?.away ?? body?.away_score);
    if (topHome !== null && topAway !== null) {
      log.warn(
        `odds-api event ${eventId}: periods["ft"] missing, fell back to top-level score. ` +
        `This may be final (ET/penalty) if match went to ET. See full payload for details.`,
        JSON.stringify(body).slice(0, 400),
      );
      home = topHome;
      away = topAway;
    }
  }

  if (home === null || away === null) {
    log.warn(`odds-api event ${eventId}: finished but regulation score unreadable`, JSON.stringify(body).slice(0, 400));
    return null;
  }

  // Log both regulation and final for monitoring: if ET/penalty happened, ft != top-level.
  const topHome = toInt(body?.scores?.home ?? body?.score?.home ?? body?.home_score);
  const topAway = toInt(body?.scores?.away ?? body?.score?.away ?? body?.away_score);
  if ((topHome !== home || topAway !== away) && topHome !== null && topAway !== null) {
    log.info(
      `odds-api event ${eventId}: regulation ${home}-${away} differs from final ${topHome}-${topAway} ` +
      `(ET or penalties detected)`,
    );
  }

  return { home, away };
}

function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && value !== null && value !== undefined && value !== '' ? n : null;
}
