/** News-engine scheduler (SPEC-wp-auto-news-2026-08-16): fires runNewsTick twice a day —
 *  05:00 VN (22:00 UTC, morning: overnight recaps) and 17:00 VN (10:00 UTC, evening:
 *  previews for tonight/the weekend). Mirrors the digest scheduler idiom: cheap check
 *  loop + UTC-date dedupe key. */
import { runNewsTick } from '../news-engine.mjs';
import { log } from './log';

const CHECK_MS = 10 * 60_000; // 10 min — the hour-wide windows are never missed
const MORNING_UTC_HOUR = 22; // 05:00 VN (next day)
const EVENING_UTC_HOUR = 10; // 17:00 VN

export type NewsEngineMode = 'dry' | 'live';

/** Returns the dedupe key + tick mode when a run is due now, else null. */
export function newsTickDue(
  now: Date,
  lastKey: string | null,
): { key: string; mode: 'morning' | 'evening' } | null {
  const hour = now.getUTCHours();
  const mode =
    hour === MORNING_UTC_HOUR ? ('morning' as const)
    : hour === EVENING_UTC_HOUR ? ('evening' as const)
    : null;
  if (!mode) return null;
  const key = `${now.toISOString().slice(0, 10)}:${mode}`;
  return key === lastKey ? null : { key, mode };
}

/** Starts the twice-daily check loop; returns a stop function.
 *  mode 'dry' = generate + log only (the spec's 1-day trial); 'live' = publish. */
export function startNewsEngineCron(cfg: { mode: NewsEngineMode }): () => void {
  log.info(`news-engine cron: started (05:00 + 17:00 VN, mode=${cfg.mode})`);
  let lastKey: string | null = null;
  const tick = async (): Promise<void> => {
    const due = newsTickDue(new Date(), lastKey);
    if (!due) return;
    lastKey = due.key;
    try {
      const articles = await runNewsTick({ mode: due.mode, dryRun: cfg.mode !== 'live' });
      log.info(
        `news-engine[${due.mode}${cfg.mode === 'live' ? '' : ' · dry'}]: ${articles.length} articles` +
          (articles.length ? ` — ${articles.map((a) => a.slug).join(', ')}` : ''),
      );
    } catch (err) {
      log.error(`news-engine[${due.mode}] tick failed:`, err);
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), CHECK_MS);
  return () => {
    clearInterval(timer);
    log.info('news-engine cron: stopped');
  };
}
