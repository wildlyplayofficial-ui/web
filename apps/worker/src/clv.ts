/**
 * CLV (closing line value): capture closing odds for the SAME selection+line
 * near kickoff, so settled picks can show "odds at publish → closing odds".
 * Strict matching only — if the exact line is gone at close, odds_close stays
 * null rather than approximating (transparency over coverage).
 */
import { sideOf } from './settle';
import type { PickRow, Store } from './store';
import { log } from './log';

/** Capture window: [kickoff - 15 min, kickoff + 45 min]. */
const WINDOW_BEFORE_MS = 15 * 60_000;
const WINDOW_AFTER_MS = 45 * 60_000;

/** Shape of one bookmaker market in the odds-api.io /v3/odds payload. */
interface OddsMarket {
  name: string;
  odds: Array<{
    hdp?: number;
    home?: string;
    draw?: string;
    away?: string;
    over?: string;
    under?: string;
  }>;
}

export type OddsPayload = { bookmakers?: Record<string, OddsMarket[]> };

/** Fetches the Bet365 odds payload for an event. Throws on HTTP errors. */
export async function fetchOddsPayload(eventId: number, apiKey: string): Promise<OddsPayload> {
  const res = await fetch(
    `https://api.odds-api.io/v3/odds?eventId=${eventId}&bookmakers=Bet365&apiKey=${apiKey}`,
  );
  if (!res.ok) throw new Error(`odds-api returned ${res.status} for event ${eventId} odds`);
  return (await res.json()) as OddsPayload;
}

const OU_MARKETS = ['Goals Over/Under', 'Totals'];

/**
 * Pure extraction: pick + odds payload → closing odds for the pick's exact
 * selection and line, or null when not found / market unsupported.
 */
export function extractClosingOdds(pick: PickRow, payload: OddsPayload): number | null {
  const markets = payload.bookmakers?.Bet365;
  if (!markets) return null;

  switch (pick.market) {
    case 'ah': {
      if (pick.line == null) return null;
      const spread = markets.find((m) => m.name === 'Spread');
      if (!spread) return null;
      const side = sideOf(pick);
      // hdp is always the HOME handicap: home line L ↔ hdp=L; away line L ↔ hdp=-L.
      const wantHdp = side === 'home' ? Number(pick.line) : -Number(pick.line);
      const entry = spread.odds.find((o) => o.hdp === wantHdp);
      return toOdds(side === 'home' ? entry?.home : entry?.away);
    }
    case 'ou': {
      if (pick.line == null) return null;
      const sel = pick.selection.trim().toLowerCase();
      const dir = sel.startsWith('over') ? 'over' : sel.startsWith('under') ? 'under' : null;
      if (!dir) return null;
      for (const name of OU_MARKETS) {
        const market = markets.find((m) => m.name === name);
        const entry = market?.odds.find((o) => o.hdp === Number(pick.line));
        const odds = toOdds(entry?.[dir]);
        if (odds !== null) return odds;
      }
      return null;
    }
    case '1x2': {
      const ml = markets.find((m) => m.name === 'ML');
      const entry = ml?.odds[0];
      if (!entry) return null;
      const sel = pick.selection.trim().toLowerCase();
      if (sel === 'draw' || sel === 'x') return toOdds(entry.draw);
      return toOdds(sideOf(pick) === 'home' ? entry.home : entry.away);
    }
    default:
      return null; // btts/other: no CLV capture in v1
  }
}

function toOdds(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? n : null;
}

export interface ClvDeps {
  store: Store;
  getOdds: (eventId: number) => Promise<OddsPayload>;
}

/**
 * One CLV pass over published picks: capture closing odds for picks inside the
 * kickoff window that don't have one yet. Failures are logged, never thrown.
 */
export async function captureClosingOdds(
  deps: ClvDeps,
  picks: PickRow[],
  now: Date = new Date(),
): Promise<void> {
  for (const pick of picks) {
    if (pick.odds_close !== null || pick.fixture_id <= 0) continue;
    const dt = now.getTime() - new Date(pick.kickoff_utc).getTime();
    if (dt < -WINDOW_BEFORE_MS || dt > WINDOW_AFTER_MS) continue;
    try {
      const payload = await deps.getOdds(pick.fixture_id);
      const odds = extractClosingOdds(pick, payload);
      if (odds === null) {
        log.warn(`clv: no closing odds found for pick ${pick.id} (${pick.market} ${pick.selection} line ${pick.line})`);
        continue;
      }
      await deps.store.updatePick(pick.id, { odds_close: odds });
      log.info(`clv: pick ${pick.id} closing odds ${odds} (publish ${pick.odds_publish})`);
    } catch (err) {
      log.warn(`clv: capture failed for pick ${pick.id}:`, err);
    }
  }
}
