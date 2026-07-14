/**
 * E3: Fixture ingestion — populates unified fixtures table from provider_mappings.
 * Runs after provider-matcher. Creates/updates fixtures with both provider IDs.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Ingest fixtures from provider_mappings into unified fixtures table. */
export async function ingestFixtures(sb: SupabaseClient): Promise<void> {
  try {
    const { data: mappings } = await sb
      .from('provider_mappings')
      .select('competition_id, home_team, away_team, kickoff_utc, odds_api_event_id, livescore_match_id, slug')
      .not('home_team', 'like', 'W%')  // Skip knockout placeholders (W101, RU101...)
      .not('home_team', 'like', 'RU%')
      .not('away_team', 'like', 'W%')
      .not('away_team', 'like', 'RU%')
      .order('kickoff_utc');

    if (!mappings?.length) return;

    // Resolve team IDs from teams table
    const { data: teams } = await sb.from('teams').select('id, canonical_name, aliases, odds_api_name, livescore_name');
    const teamMap = new Map<string, string>(); // normalized name → team id
    for (const t of (teams ?? []) as { id: string; canonical_name: string; aliases: string[]; odds_api_name: string | null; livescore_name: string | null }[]) {
      teamMap.set(t.canonical_name.toLowerCase(), t.id);
      if (t.odds_api_name) teamMap.set(t.odds_api_name.toLowerCase(), t.id);
      if (t.livescore_name) teamMap.set(t.livescore_name.toLowerCase(), t.id);
      for (const alias of t.aliases) teamMap.set(alias.toLowerCase(), t.id);
    }

    let created = 0;
    for (const m of mappings as { competition_id: string; home_team: string; away_team: string; kickoff_utc: string; odds_api_event_id: number | null; livescore_match_id: string | null; slug: string | null }[]) {
      const homeId = teamMap.get(m.home_team.toLowerCase()) ?? null;
      const awayId = teamMap.get(m.away_team.toLowerCase()) ?? null;
      const slug = m.slug ?? `${slugify(m.home_team)}-vs-${slugify(m.away_team)}-${m.kickoff_utc.slice(0, 10)}`;

      const { error } = await sb.from('fixtures').upsert({
        competition_id: m.competition_id,
        home_team_id: homeId,
        away_team_id: awayId,
        home_team_name: m.home_team,
        away_team_name: m.away_team,
        kickoff_utc: m.kickoff_utc,
        slug,
        odds_api_event_id: m.odds_api_event_id,
        livescore_match_id: m.livescore_match_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'competition_id,home_team_name,away_team_name,kickoff_utc' });

      if (!error) created++;
    }

    if (created > 0) log.info(`fixture-ingest: upserted ${created} fixture(s)`);

    // M1: auto-link unlinked picks/watching to fixtures
    try { await sb.rpc('backfill_fixture_links'); } catch { /* best-effort */ }
  } catch (err) { log.warn('fixture-ingest failed:', err); }
}
