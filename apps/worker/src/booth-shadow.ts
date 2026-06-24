/**
 * The Booth P1a: Shadow orchestrator.
 * Polls events for live pick-matches, triggers AI commentary gen,
 * lints output, and writes to booth_shadow (admin-only, NOT public).
 *
 * Pipeline per key-event:
 *   detectNewEvents → generateBoothExchange → lintBoothOutput → DB insert
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PickRow } from './store';
import type { BoothEvent } from './booth-detector';
import type { BoothOutput } from './booth-gen';
import { detectNewEvents } from './booth-detector';
import { generateBoothExchange } from './booth-gen';
import { lintBoothOutput } from './booth-lint';
import { log } from './log';

const DEBOUNCE_MS = 90_000; // No 2 exchanges within 90s per match

interface BoothShadowDeps {
  supabase: SupabaseClient;
  apiKey: string;
  sonnetModel?: string;
  haikuModel?: string;
}

/** In-memory state per tracked match. */
interface MatchState {
  seenEventIds: Set<string>;
  lastGenAt: number; // epoch ms — for debounce
}

const matchStates = new Map<string, MatchState>();

function getState(matchId: string): MatchState {
  let s = matchStates.get(matchId);
  if (!s) {
    s = { seenEventIds: new Set(), lastGenAt: 0 };
    matchStates.set(matchId, s);
  }
  return s;
}

/** Find live pick-matches: picks with status='published' + a linked live match. */
async function getLivePickMatches(
  supabase: SupabaseClient,
): Promise<Array<{ pick: PickRow; eventsUrl: string; matchId: string }>> {
  // Get published (unsettled) picks
  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('status', 'published')
    .not('thesis', 'is', null);
  if (!picks?.length) return [];

  // Get live matches
  const { data: matches } = await supabase
    .from('match_live_state')
    .select('id, home_team, away_team, status, events_url')
    .eq('status', 'live');
  if (!matches?.length) return [];

  // Match picks to live matches by team names
  const results: Array<{ pick: PickRow; eventsUrl: string; matchId: string }> = [];
  for (const pick of picks as PickRow[]) {
    const match = matches.find(
      (m: Record<string, unknown>) =>
        normalize(m.home_team as string) === normalize(pick.home_team) &&
        normalize(m.away_team as string) === normalize(pick.away_team),
    );
    if (match?.events_url) {
      results.push({
        pick,
        eventsUrl: match.events_url as string,
        matchId: match.id as string,
      });
    }
  }
  return results;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/** Process ONE new event: gen → lint → write shadow. */
async function processEvent(
  deps: BoothShadowDeps,
  event: BoothEvent,
  pick: PickRow,
  matchId: string,
): Promise<void> {
  const state = getState(matchId);

  // Debounce: skip if too recent
  const now = Date.now();
  if (now - state.lastGenAt < DEBOUNCE_MS) {
    log.info(`booth: debounce skip ${event.type} ${event.minute}' (${matchId})`);
    return;
  }

  const pickCtx = {
    selection: pick.selection,
    odds: pick.odds_publish,
    market: pick.market,
    line: pick.line,
    stake: pick.stake_units,
    thesis: pick.thesis,
    status: pick.status,
  };

  const eventCtx = {
    type: event.type,
    minute: event.minute,
    player: event.player,
    assist: event.assist,
    homeAway: event.homeAway,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    score: event.scoreAtEvent,
  };

  const output = await generateBoothExchange(
    { apiKey: deps.apiKey, sonnetModel: deps.sonnetModel, haikuModel: deps.haikuModel },
    eventCtx,
    pickCtx,
    pick.thesis,
  );
  if (!output) {
    log.warn(`booth: gen failed for ${event.type} ${event.minute}' (${matchId})`);
    return;
  }

  // Lint EN output
  const lint = lintBoothOutput(output.lines_en);

  // Write to shadow table (even if lint fails — record for review)
  const { error } = await deps.supabase.from('booth_shadow').insert({
    pick_id: pick.id,
    match_id: matchId,
    event_type: event.type,
    event_minute: event.minute,
    event_detail: {
      player: event.player,
      assist: event.assist,
      home_away: event.homeAway,
      score: event.scoreAtEvent,
    },
    lead_voice: output.lead_voice,
    lines_en: output.lines_en,
    lines_vi: output.lines_vi,
    lines_th: output.lines_th,
    lines_es: output.lines_es,
    lint_passed: lint.passed,
    lint_flags: lint.flags.length > 0 ? lint.flags : null,
    model: output.model,
  });

  if (error) {
    log.warn(`booth: shadow insert error:`, error.message);
  } else {
    state.lastGenAt = now;
    const status = lint.passed ? 'OK' : `LINT_FAIL(${lint.flags.length})`;
    log.info(`booth: ${event.type} ${event.minute}' → ${output.lead_voice} leads [${status}]`);
  }
}

/** Single tick: check all live pick-matches for new events. */
export async function boothTick(deps: BoothShadowDeps): Promise<void> {
  try {
    const liveMatches = await getLivePickMatches(deps.supabase);
    if (liveMatches.length === 0) return;

    for (const { pick, eventsUrl, matchId } of liveMatches) {
      const state = getState(matchId);
      const newEvents = await detectNewEvents(eventsUrl, state.seenEventIds);

      for (const ev of newEvents) {
        state.seenEventIds.add(ev.id);
        await processEvent(deps, ev, pick, matchId);
      }
    }
  } catch (err) {
    log.warn('booth: tick failed:', err);
  }
}

/** Start the Booth shadow cron. Returns stop function. */
export function startBoothShadow(deps: BoothShadowDeps): () => void {
  const INTERVAL = 30_000; // 30s — aggressive for live, bounded by debounce
  const timer = setInterval(() => void boothTick(deps), INTERVAL);
  void boothTick(deps); // immediate first tick
  log.info('booth-shadow: cron started (every 30s)');
  return () => clearInterval(timer);
}
