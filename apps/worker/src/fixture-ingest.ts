/**
 * E3: Fixture ingestion — populates unified fixtures table from provider_mappings.
 * Runs after provider-matcher. Creates/updates fixtures with both provider IDs.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** PostgREST trả tối đa 1000 dòng một lần gọi (đo trên prod 27/8/2026) — bảng lớn hơn phải phân trang. */
const TRAN_MOT_TRANG = 1000;

type TruyVanPhanTrang<T> = {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

/** Đọc HẾT kết quả một truy vấn theo từng trang `kichThuoc` dòng. `taoQuery` phải trả builder MỚI mỗi lần
 *  (builder supabase-js không dùng lại được sau khi await) và đã `.order()` theo khoá ổn định (có cột duy nhất)
 *  để các trang không giẫm/sót nhau. Trang lỗi thì ném luôn — không trả về kết quả thiếu. */
export async function layHet<T>(taoQuery: () => TruyVanPhanTrang<T>, kichThuoc = TRAN_MOT_TRANG): Promise<T[]> {
  const tatCa: T[] = [];
  for (let from = 0; ; from += kichThuoc) {
    const { data, error } = await taoQuery().range(from, from + kichThuoc - 1);
    if (error) throw new Error(`layHet: lỗi trang từ dòng ${from} (đã gom ${tatCa.length}): ${error.message}`);
    const trang = data ?? [];
    tatCa.push(...trang);
    if (trang.length < kichThuoc) return tatCa;
  }
}

type MappingRow = { competition_id: string; home_team: string; away_team: string; kickoff_utc: string; odds_api_event_id: number | null; livescore_match_id: string | null; slug: string | null };

/** Placeholder vòng knock-out từ provider (W101, RU101, L12…): chữ W / RU / L rồi toàn chữ số.
 *  Bộ lọc DB `like 'W%'` cũ cắt luôn đội thật bắt đầu bằng W (Werder Bremen, 11 trận — đo 27/8/2026). */
export function laPlaceholder(ten: string): boolean {
  return /^(W|RU|L)\d+$/.test(ten.trim());
}

/** Ingest fixtures from provider_mappings into unified fixtures table. */
export async function ingestFixtures(sb: SupabaseClient): Promise<void> {
  try {
    // provider_mappings đã vượt trần 1000 dòng (1301 dòng, 27/8/2026): select không phân trang chỉ trả
    // 1000 nên 247 trận xa nhất chưa bao giờ vào fixtures. order('id') phụ để thứ tự trang ổn định.
    const tatCa = await layHet<MappingRow>(() => sb
      .from('provider_mappings')
      .select('competition_id, home_team, away_team, kickoff_utc, odds_api_event_id, livescore_match_id, slug')
      .order('kickoff_utc')
      .order('id'));
    if (!tatCa.length) return;

    // Lọc placeholder trong code (không dùng like 'W%' trên DB nữa — xem laPlaceholder).
    const mappings = tatCa.filter((m) => !laPlaceholder(m.home_team) && !laPlaceholder(m.away_team));

    // Resolve team IDs from teams table (196 dòng ngày 27/8/2026 — dưới trần 1000, chưa cần phân trang)
    const { data: teams } = await sb.from('teams').select('id, canonical_name, aliases, odds_api_name, livescore_name');
    const teamMap = new Map<string, string>(); // normalized name → team id
    for (const t of (teams ?? []) as { id: string; canonical_name: string; aliases: string[]; odds_api_name: string | null; livescore_name: string | null }[]) {
      teamMap.set(t.canonical_name.toLowerCase(), t.id);
      if (t.odds_api_name) teamMap.set(t.odds_api_name.toLowerCase(), t.id);
      if (t.livescore_name) teamMap.set(t.livescore_name.toLowerCase(), t.id);
      for (const alias of t.aliases) teamMap.set(alias.toLowerCase(), t.id);
    }

    let created = 0;
    for (const m of mappings) {
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

    log.info(`fixture-ingest: đọc ${tatCa.length} mapping(s), bỏ ${tatCa.length - mappings.length} placeholder, upserted ${created}`);

    // M1: auto-link unlinked picks/watching to fixtures
    try { await sb.rpc('backfill_fixture_links'); } catch { /* best-effort */ }
  } catch (err) { log.warn('fixture-ingest failed:', err); }
}
