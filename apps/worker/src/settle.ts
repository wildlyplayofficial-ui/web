/**
 * Settlement orchestration: pick + final score → updated row.
 * NO settlement math here — all math lives in packages/settlement (deterministic code rule).
 */
import {
  displayStatus,
  settle1x2,
  settleAsianHandicap,
  settleBtts,
  settleOverUnder,
  unitsPL,
  type RawOutcome,
  type Score,
  type Side,
} from '@wildlyplay/settlement';
import type { PickRow, Store } from './store';

/** Map the pick's market/selection onto the settlement engine. Throws on unmappable picks. */
export function computeOutcome(pick: PickRow, score: Score): RawOutcome {
  const sel = pick.selection.trim().toLowerCase();
  switch (pick.market) {
    case 'ah': {
      if (pick.line == null) throw new Error(`pick ${pick.id}: ah pick has no line`);
      // Running pick (Nick, 12/6): the handicap covers only goals scored AFTER entry,
      // so offset the final score by the score at publish. OU/1x2/btts stay full-match.
      const ahScore: Score =
        pick.publish_score_home != null && pick.publish_score_away != null
          ? { home: score.home - pick.publish_score_home, away: score.away - pick.publish_score_away }
          : score;
      return settleAsianHandicap(sideOf(pick), Number(pick.line), ahScore);
    }
    case 'ou': {
      if (pick.line == null) throw new Error(`pick ${pick.id}: ou pick has no line`);
      if (sel.startsWith('over')) return settleOverUnder('over', Number(pick.line), score);
      if (sel.startsWith('under')) return settleOverUnder('under', Number(pick.line), score);
      throw new Error(`pick ${pick.id}: cannot read over/under from selection "${pick.selection}"`);
    }
    case '1x2': {
      if (sel === 'draw' || sel === 'x') return settle1x2('draw', score);
      return settle1x2(sideOf(pick), score);
    }
    case 'btts': {
      if (sel !== 'yes' && sel !== 'no') {
        throw new Error(`pick ${pick.id}: btts selection must be yes/no, got "${pick.selection}"`);
      }
      return settleBtts(sel, score);
    }
    case 'other':
      throw new Error(`pick ${pick.id}: market "other" has no automatic settlement math`);
  }
}

export function sideOf(pick: PickRow): Side {
  const sel = pick.selection.toLowerCase();
  if (sel.includes(pick.home_team.toLowerCase()) || sel.startsWith('home')) return 'home';
  if (sel.includes(pick.away_team.toLowerCase()) || sel.startsWith('away')) return 'away';
  throw new Error(
    `pick ${pick.id}: selection "${pick.selection}" matches neither ` +
    `"${pick.home_team}" nor "${pick.away_team}"`,
  );
}

/** Settle a published pick: compute outcome + units, persist settlement fields. */
export async function settlePick(
  store: Store,
  pick: PickRow,
  score: Score,
  now: Date = new Date(),
): Promise<PickRow> {
  if (pick.status !== 'published') {
    throw new Error(`pick ${pick.id} is not settleable (status=${pick.status})`);
  }
  const raw = computeOutcome(pick, score);
  return store.updatePick(pick.id, {
    home_score: score.home,
    away_score: score.away,
    raw_outcome: raw,
    units_pl: unitsPL(raw, Number(pick.odds_publish), Number(pick.stake_units)),
    status: displayStatus(raw),
    settled_at: now.toISOString(),
  });
}
