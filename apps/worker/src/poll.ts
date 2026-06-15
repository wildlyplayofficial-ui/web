/**
 * Results poller: every 10 min, settle published picks whose event finished.
 * Only polls between kickoff+100min and kickoff+8h per pick. Logs and fails loudly.
 */
import type { Score } from '@wildlyplay/settlement';
import { captureClosingOdds, type OddsPayload } from './clv';
import { settlePick } from './settle';
import type { PickRow, Store } from './store';
import { log } from './log';

export const POLL_INTERVAL_MS = 10 * 60_000;
const WINDOW_START_MS = 100 * 60_000; // kickoff + 100 min
const WINDOW_END_MS = 8 * 3_600_000;  // kickoff + 8 h

export interface PollerDeps {
  store: Store;
  getScore: (eventId: number) => Promise<Score | null>;
  onSettled: (pick: PickRow) => Promise<void>;
  /** CLV: optional closing-odds fetcher — capture failures never block settlement. */
  getOdds?: (eventId: number) => Promise<OddsPayload>;
}

export async function pollOnce(deps: PollerDeps, now: Date = new Date()): Promise<void> {
  const pending = await deps.store.listByStatus(['published']);
  log.info(`poll: ${pending.length} published pick(s) pending settlement`);
  if (deps.getOdds) {
    await captureClosingOdds({ store: deps.store, getOdds: deps.getOdds }, pending, now);
  }
  for (const pick of pending) {
    const age = now.getTime() - new Date(pick.kickoff_utc).getTime();
    if (age < WINDOW_START_MS) continue; // match not plausibly finished yet
    if (pick.fixture_id <= 0) {
      log.warn(`poll: pick ${pick.id} has no event id — settle manually with /score`);
      continue;
    }
    if (age > WINDOW_END_MS) {
      log.warn(`poll: pick ${pick.id} is past the 8h polling window — settle manually with /score`);
      continue;
    }
    try {
      const score = await deps.getScore(pick.fixture_id);
      if (!score) {
        log.info(`poll: event ${pick.fixture_id} (pick ${pick.id}) not finished yet`);
        continue;
      }
      const settled = await settlePick(deps.store, pick, score);
      log.info(
        `poll: settled pick ${pick.id} ${score.home}-${score.away} → ` +
        `${settled.status} (${settled.raw_outcome}, ${settled.units_pl}u)`,
      );
      await deps.onSettled(settled);
    } catch (err) {
      log.error(`poll: settling pick ${pick.id} failed:`, err);
    }
  }
}

/** Starts the interval loop; returns a stop function. */
export function startPoller(deps: PollerDeps): () => void {
  log.info(`poller started (every ${POLL_INTERVAL_MS / 60_000} min)`);
  const tick = () => void pollOnce(deps).catch((err) => log.error('poll tick failed:', err));
  tick();
  const timer = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    clearInterval(timer);
    log.info('poller stopped');
  };
}
