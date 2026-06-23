/**
 * T5: Post-mortem review workflow.
 * After settlement, AI generates a draft review. Curator approves via bot.
 * Settlement NEVER waits for AI — this is fire-and-forget.
 */
import { callClaude } from './recap';
import type { PickRow, Store } from './store';
import { log } from './log';

export type LossType = 'variance' | 'thesis-error' | 'price-error' | 'model-error';
export const LOSS_TYPES: LossType[] = ['variance', 'thesis-error', 'price-error', 'model-error'];

const SLA_HOURS = 24;

export interface PostmortemDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
}

function buildPrompt(pick: PickRow): string {
  const pl = Number(pick.units_pl);
  const lossInstruction = pick.status === 'lost'
    ? '\n- This was a LOSS. You MUST identify the loss-type at the start: variance (thesis right, result wrong), thesis-error (read was wrong), price-error (right read but wrong price), model-error (systematic flaw).'
    : '';
  const winInstruction = pick.status === 'won'
    ? `\n- This was a WIN. Apply HONEST CALIBRATION:
  - If confidence was LOW or odds were near coinflip: acknowledge variance played a role. Do NOT claim skill on a coinflip.
  - State what could have gone wrong (confounds). A win does not mean the thesis was perfectly right.
  - Do NOT use phrases like "no luck needed", "thesis validated perfectly", "beat the market".
  - Be symmetrically honest: WIN reviews must be as critical as LOSS reviews. Praise the read only when evidence clearly supports it.`
    : '';

  return `<role>
You are WildlyPlay's post-mortem analyst. You write brutally honest, concise reviews of settled football picks — no hype, no excuses, no spin.
</role>

<context>
Result: ${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}
League: ${pick.league}
Market: ${pick.market}, Selection: ${pick.selection}, Line: ${pick.line ?? 'n/a'}
Odds: ${pick.odds_publish}, Stake: ${Number(pick.stake_units)}u
Outcome: ${pick.raw_outcome} (${pl > 0 ? `+${pl}` : pl}u)
Pre-match thesis: "${pick.thesis}"
</context>

<rules>
- Did the thesis play out? Analyse specifically what happened vs what was expected.${lossInstruction}${winInstruction}
- Work ONLY from the data above — do not invent xG, possession stats, or match events you cannot know from the score alone.
- Be honest and analytical. No hype, no excuses, no sugar-coating.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie".
- Responsible language: NEVER use "sure win", "guaranteed", "lock" or any promise of profit.
</rules>

<bad_examples>
BAD: "The thesis was wrong and we lost. Tough break but we move on to the next one."
WHY: No analysis of WHY the thesis was wrong, no specific reference to the match data, generic filler ending.
</bad_examples>

<good_examples>
GOOD: "Ecuador's xG dominated (2.1 vs 0.3) but Curacao's keeper made 7 saves — variance, not a bad read. The thesis that Ecuador would control territory held; the price was fair. Loss-type: variance."
WHY: Specific data, clear thesis evaluation, honest classification with reasoning.
</good_examples>

<output>
Write a post-mortem review in 100-150 words. Plain text, no markdown headers.
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) loss-type stated clearly if this was a loss, (4) thesis explicitly evaluated against the result.
</self_critique>`;
}

/** Fire-and-forget: generate AI draft after settlement. Never throws. */
export async function generatePostmortemDraft(deps: PostmortemDeps, pick: PickRow): Promise<void> {
  try {
    const draft = await callClaude(deps.env, buildPrompt(pick), `postmortem pick ${pick.id}`, 400);
    if (!draft) return;
    await deps.store.updatePick(pick.id, {
      postmortem_draft: draft,
      postmortem_status: 'pending',
    });
    log.info(`postmortem draft generated for pick ${pick.id}`);
  } catch (err) {
    log.warn(`postmortem draft failed for pick ${pick.id} (non-fatal):`, err);
  }
}

/** T6: List picks where postmortem is pending and settled_at > SLA_HOURS ago. */
export async function listOverdue(store: Store): Promise<PickRow[]> {
  const settled = await store.listByStatus(['won', 'lost', 'push']);
  const cutoff = Date.now() - SLA_HOURS * 3_600_000;
  return settled.filter(
    (p) => p.postmortem_status === 'pending' && p.settled_at && new Date(p.settled_at).getTime() < cutoff,
  );
}

/** Format a pick for the /review or /overdue command display. */
export function formatPostmortemCard(pick: PickRow): string {
  const age = pick.settled_at
    ? Math.round((Date.now() - new Date(pick.settled_at).getTime()) / 3_600_000)
    : 0;
  return [
    `${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}`,
    `${pick.status?.toUpperCase()} | ${pick.selection} @ ${pick.odds_publish}`,
    `Settled ${age}h ago | id: ${pick.id.slice(0, 8)}`,
    '',
    pick.postmortem_draft ?? '(no draft)',
  ].join('\n');
}
