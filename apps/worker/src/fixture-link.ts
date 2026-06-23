/**
 * M1: Auto-link picks/watching to unified fixture at creation time.
 * Resolves by team names + kickoff date from the fixtures table.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function teamsMatch(a: string, b: string): boolean {
  const an = normalize(a), bn = normalize(b);
  if (an === bn) return true;
  if (an.includes(bn) || bn.includes(an)) return true;
  const af = an.split(' ')[0], bf = bn.split(' ')[0];
  return af.length >= 4 && (af.startsWith(bf) || bf.startsWith(af));
}

/** Find unified fixture ID by team names + kickoff date. */
export async function resolveFixtureId(
  sb: SupabaseClient,
  homeTeam: string,
  awayTeam: string,
  kickoffUtc: string,
): Promise<string | null> {
  try {
    const date = kickoffUtc.slice(0, 10);
    const { data } = await sb
      .from('fixtures')
      .select('id, home_team_name, away_team_name')
      .gte('kickoff_utc', `${date}T00:00:00Z`)
      .lte('kickoff_utc', `${date}T23:59:59Z`);

    if (!data?.length) return null;

    const match = (data as { id: string; home_team_name: string; away_team_name: string }[])
      .find((f) => teamsMatch(f.home_team_name, homeTeam) && teamsMatch(f.away_team_name, awayTeam));

    return match?.id ?? null;
  } catch (err) {
    log.warn('fixture-link: resolve failed', err);
    return null;
  }
}

/** Link a pick to its unified fixture (fire-and-forget). */
export async function linkPickToFixture(
  sb: SupabaseClient,
  pickId: string,
  homeTeam: string,
  awayTeam: string,
  kickoffUtc: string,
): Promise<void> {
  const fixtureId = await resolveFixtureId(sb, homeTeam, awayTeam, kickoffUtc);
  if (!fixtureId) return;
  await sb.from('picks').update({ unified_fixture_id: fixtureId }).eq('id', pickId);
  log.info(`fixture-link: pick ${pickId.slice(0, 8)} → fixture ${fixtureId.slice(0, 8)}`);
}

/** Link a watching entry to its unified fixture (fire-and-forget). */
export async function linkWatchingToFixture(
  sb: SupabaseClient,
  watchingId: string,
  homeTeam: string,
  awayTeam: string,
  kickoffUtc: string,
): Promise<void> {
  const fixtureId = await resolveFixtureId(sb, homeTeam, awayTeam, kickoffUtc);
  if (!fixtureId) return;
  await sb.from('watching').update({ unified_fixture_id: fixtureId }).eq('id', watchingId);
  log.info(`fixture-link: watching ${watchingId.slice(0, 8)} → fixture ${fixtureId.slice(0, 8)}`);
}
