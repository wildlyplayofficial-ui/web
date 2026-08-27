/**
 * M2: Auto-match fixtures across odds-api and livescore providers.
 * Populates provider_mappings table. Runs on worker boot + periodically.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';
import { lsFetch } from './ls-fetch';

const LS_BASE = 'https://livescore-api.com/api-client';

/** Normalize team name for matching across providers. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string> = {
  turkey: 'turkiye', turkiye: 'turkiye',
  'czech republic': 'czechia', czechia: 'czechia',
  'south korea': 'korea republic', 'korea republic': 'korea republic',
  usa: 'united states', 'united states': 'united states',
  'dr congo': 'congo dr', 'congo dr': 'congo dr',
  'ivory coast': 'cote d ivoire', 'cote d ivoire': 'cote d ivoire',
  'bosnia herzegovina': 'bosnia', 'bosnia and herzegovina': 'bosnia',
  curacao: 'curacao', 'curaçao': 'curacao',
};

function canonical(name: string): string {
  const n = normalize(name);
  return ALIASES[n] ?? n;
}

/** Chữ chỉ LOẠI HÌNH câu lạc bộ, không phải tên riêng. Hai nhà cung cấp tuỳ hứng
 *  thêm bớt: odds ghi "Liverpool FC", livescore ghi "Liverpool". */
const CHU_THUA = new Set([
  'fc', 'afc', 'cf', 'sc', 'ac', 'ss', 'as', 'us', 'cd', 'ud', 'rc', 'bk', 'if',
  'sk', 'fk', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'rb', 'ssc', 'ca', 'club', 'calcio',
  'de', 'the', 'deportivo',
]);

/** Tiếng Đức viết được hai kiểu: Mönchengladbach → Monchengladbach (odds) hoặc
 *  Moenchengladbach (livescore). Gộp về một mối. */
function gopDuc(s: string): string {
  return s.replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/ae/g, 'a').replace(/ss/g, 's');
}

/** Tên đội tách thành tập TỪ, đã bỏ chữ thừa và số năm thành lập ("Como 1907"). */
export function tuTen(name: string): Set<string> {
  return new Set(
    gopDuc(canonical(name))
      .split(' ')
      .filter((w) => w && !CHU_THUA.has(w) && !/^\d+$/.test(w)),
  );
}

/** Khớp khi tập từ của tên NGẮN nằm trọn trong tên DÀI.
 *  So nguyên chuỗi thì trượt 82% (đo 27/8/2026 trên 89 trận của 5 giải: chỉ 16 ghép
 *  được). So theo từ thì 86/89. Ghép được "Sassuolo Calcio"↔"Sassuolo",
 *  "Real Betis Seville"↔"Real Betis", "Como 1907"↔"Como".
 *  KHÔNG khớp "Manchester City"↔"Manchester United" vì không bên nào là tập con. */
export function teamsMatch(a: string, b: string): boolean {
  const A = tuTen(a), B = tuTen(b);
  if (A.size === 0 || B.size === 0) return false;
  const [nho, lon] = A.size <= B.size ? [A, B] : [B, A];
  for (const w of nho) if (!lon.has(w)) return false;
  return true;
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

interface Competition { id: string; livescore_id: number; odds_api_key: string }
interface OddsEvent { id: number; home: string; away: string; date: string }
interface LsFixture { id: string; fixture_id: string; home_name: string; away_name: string; date: string; time: string }

interface HangMapping {
  competition_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  odds_api_event_id: number | null;
  livescore_match_id: string | null;
  confidence: string;
  slug: string;
}

/** Ghi một trận vào provider_mappings, lấy MÃ NHÀ CUNG CẤP làm khoá.
 *
 *  Trước đây dùng upsert với khoá `competition_id,home_team,away_team,kickoff_utc`.
 *  Giờ đá KHÔNG phải là thứ đứng yên: 26-27/8/2026 Liga MX nhích giờ 5-10 phút giữa
 *  hai lần chạy, thế là mỗi lần nhích lại đẻ một dòng MỚI thay vì sửa dòng cũ —
 *  cùng một trận, cùng một mã tỷ số, hai dòng, hai giờ đá khác nhau.
 *  Mã nhà cung cấp thì đứng yên, nên lấy nó làm khoá.
 *
 *  Ghép được rồi thì DỌN LUÔN dòng thừa: dòng ls-only cũ mang cùng mã tỷ số bị xoá,
 *  vì thông tin của nó đã nằm trọn trong dòng vừa ghi. Không dọn thì dòng cũ ở lại
 *  mãi và lịch thi đấu vẫn hiện hai lần.
 */
export async function ghiMapping(sb: SupabaseClient, hang: HangMapping): Promise<{ error: { message: string } | null }> {
  const boc = hang.odds_api_event_id
    ? { odds_api_event_id: hang.odds_api_event_id }
    : { livescore_match_id: hang.livescore_match_id };
  const day = { ...hang, updated_at: new Date().toISOString() };

  const cot = 'id, odds_api_event_id, livescore_match_id';
  let { data: cu } = await sb.from('provider_mappings').select(cot)
    .match({ competition_id: hang.competition_id, ...boc }).limit(1);

  // Chưa có dòng mang mã này → dò theo KHOÁ TỰ NHIÊN, đúng bộ cột unique của bảng
  // (competition_id, home_team, away_team, kickoff_utc). Nhánh chỉ-livescore 27/8/2026
  // 15:41Z (odds-api 429 mọi khoá) gặp dòng odds-only cùng tên cùng giờ → INSERT vỡ
  // "duplicate key" mỗi lượt, mã tỷ số không bao giờ được gắn vào. Gộp thay vì chèn.
  if (!cu?.length) {
    ({ data: cu } = await sb.from('provider_mappings').select(cot)
      .match({ competition_id: hang.competition_id, home_team: hang.home_team, away_team: hang.away_team, kickoff_utc: hang.kickoff_utc })
      .limit(1));
    if (cu?.length) log.info(`provider-matcher: gộp ${hang.home_team} vs ${hang.away_team} vào dòng có sẵn ${cu[0].id} (khoá tự nhiên)`);
  }

  let error: { message: string } | null;
  if (cu?.length) {
    // Sửa dòng cũ thì GIỮ mã của nhà cung cấp kia, không ghi đè bằng null — kẻo lượt
    // chỉ-livescore kế tiếp lại xoá mã kèo vừa gộp.
    const gop = {
      ...day,
      odds_api_event_id: hang.odds_api_event_id ?? cu[0].odds_api_event_id,
      livescore_match_id: hang.livescore_match_id ?? cu[0].livescore_match_id,
    };
    if (gop.odds_api_event_id && gop.livescore_match_id) gop.confidence = 'auto';
    ({ error } = await sb.from('provider_mappings').update(gop).eq('id', cu[0].id));
  } else {
    ({ error } = await sb.from('provider_mappings').insert(day));
  }
  if (error) return { error };

  if (hang.odds_api_event_id && hang.livescore_match_id) {
    const { data: thua } = await sb.from('provider_mappings').select('id')
      .eq('competition_id', hang.competition_id)
      .eq('livescore_match_id', hang.livescore_match_id)
      .is('odds_api_event_id', null);
    for (const r of thua ?? []) {
      await sb.from('provider_mappings').delete().eq('id', r.id);
      log.info(`provider-matcher: dọn dòng thừa ${r.id} — đã gộp vào dòng có cả kèo lẫn tỷ số`);
    }
  }
  return { error: null };
}

/** Fetch active competitions from DB. */
async function getActiveCompetitions(sb: SupabaseClient): Promise<Competition[]> {
  const { data } = await sb.from('competitions').select('id, livescore_id, odds_api_key').eq('status', 'active');
  return (data ?? []) as Competition[];
}

/** Fetch odds-api events for a competition.
 *  Nhà cung cấp chặn ở 100 lượt/giờ MỖI KHOÁ (gói free — email Odds-API.io 26/8).
 *  Có nhiều khoá thì gặp 429 chuyển sang khoá kế rồi gọi lại, thay vì bỏ giải.
 *  Cùng cách odds-collect.ts đang làm; trước đây hàm này chỉ cầm 1 khoá nên chỉ
 *  với tới 100 trong tổng 300 lượt/giờ mình đang có. */
async function fetchOddsEvents(
  khoa: readonly string[],
  league: string,
  bd: { i: number },
  fetchImpl: typeof fetch = fetch,
): Promise<OddsEvent[]> {
  if (khoa.length === 0) return [];
  try {
    for (let lan = 0; lan < khoa.length; lan++) {
      const res = await fetchImpl(
        `https://api.odds-api.io/v3/events?sport=football&league=${league}&apiKey=${khoa[bd.i]}`,
      );
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      if (res.status !== 429) {
        log.warn(`provider-matcher: odds-api ${res.status} for ${league}`);
        return [];
      }
      log.warn(`provider-matcher: khoá ${bd.i + 1}/${khoa.length} hết lượt, đổi khoá`);
      bd.i = (bd.i + 1) % khoa.length;
    }
    log.warn(`provider-matcher: bỏ ${league} — odds-api 429, mọi khoá đều hết lượt`);
    return [];
  } catch { return []; }
}

/** Fetch livescore fixtures for a date + competition. */
async function fetchLsFixtures(key: string, secret: string, compId: number, date: string): Promise<LsFixture[]> {
  try {
    const res = await lsFetch(`${LS_BASE}/fixtures/matches.json?key=${key}&secret=${secret}&competition_id=${compId}&date=${date}`);
    const data = await res.json();
    return data.success && data.data?.fixtures ? data.data.fixtures : [];
  } catch { return []; }
}

/** Generate next N dates from today (YYYY-MM-DD, UTC). */
function nextDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Run auto-matching for all active competitions. */
export async function runProviderMatcher(
  sb: SupabaseClient,
  oddsApiKey: string | readonly string[],
  lsKey: string,
  lsSecret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  // Nhận 1 khoá hoặc mảng khoá — chỗ gọi cũ truyền chuỗi vẫn chạy như trước.
  const khoa = (Array.isArray(oddsApiKey) ? oddsApiKey : [oddsApiKey]).filter(Boolean) as string[];
  const bd = { i: 0 };   // con trỏ khoá, giữ qua cả vòng để không quay lại khoá đã cạn
  const competitions = await getActiveCompetitions(sb);
  let total = 0;

  for (const comp of competitions) {
    if (!comp.livescore_id) continue;

    const oddsEvents = comp.odds_api_key ? await fetchOddsEvents(khoa, comp.odds_api_key, bd, fetchImpl) : [];
    log.info(`provider-matcher: ${comp.id} — ${oddsEvents.length} odds events, fetching LS...`);

    // Primary source: livescore schedule (next 7 days, or dates from odds events)
    const dates = oddsEvents.length > 0
      ? [...new Set(oddsEvents.map((e) => e.date.slice(0, 10)))]
      : nextDates(7);

    const lsFixtures: LsFixture[] = [];
    for (const d of dates.slice(0, 7)) {
      lsFixtures.push(...await fetchLsFixtures(lsKey, lsSecret, comp.livescore_id, d));
    }

    if (oddsEvents.length > 0) {
      // Cross-match: odds-api events enriched with livescore IDs
      for (const odds of oddsEvents) {
        // Ghép NHẦM hại hơn không ghép: nó gắn tỷ số trực tiếp của trận khác vào.
        // Nên khi có từ 2 trận cùng khớp thì BỎ, thà thiếu còn hơn sai.
        const ungVien = lsFixtures.filter((f) =>
          teamsMatch(odds.home, f.home_name) &&
          teamsMatch(odds.away, f.away_name) &&
          sameDay(odds.date, `${f.date}T${f.time || '00:00'}Z`),
        );
        if (ungVien.length > 1) {
          log.warn(`provider-matcher: BỎ ${odds.home} vs ${odds.away} — ${ungVien.length} trận cùng khớp, mập mờ`);
        }
        const ls = ungVien.length === 1 ? ungVien[0] : undefined;
        const slug = `${canonical(odds.home).replace(/\s+/g, '-')}-vs-${canonical(odds.away).replace(/\s+/g, '-')}-${odds.date.slice(0, 10)}`;
        await ghiMapping(sb, {
          competition_id: comp.id,
          home_team: odds.home,
          away_team: odds.away,
          kickoff_utc: odds.date,
          odds_api_event_id: odds.id,
          livescore_match_id: ls ? String(ls.id || ls.fixture_id) : null,
          confidence: ls ? 'auto' : 'odds-only',
          slug,
        });
        total++;
      }
    } else {
      // Livescore-only: use schedule as primary source (odds-api inactive/off-season)
      let lsOk = 0;
      for (const ls of lsFixtures) {
        // Livescore may return DD.MM.YYYY — normalize to YYYY-MM-DD
        const ddmmyyyy = ls.date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        const isoDate = ddmmyyyy ? `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}` : ls.date;
        // ls.time may be HH:MM or HH:MM:SS — take first HH:MM only
        const hhmm = ls.time?.match(/^(\d{2}:\d{2})/)?.[1] ?? '00:00';
        const kickoff = `${isoDate}T${hhmm}:00Z`;
        const slug = `${canonical(ls.home_name).replace(/\s+/g, '-')}-vs-${canonical(ls.away_name).replace(/\s+/g, '-')}-${isoDate}`;
        const { error } = await ghiMapping(sb, {
          competition_id: comp.id,
          home_team: ls.home_name,
          away_team: ls.away_name,
          kickoff_utc: kickoff,
          odds_api_event_id: null,
          livescore_match_id: String(ls.id || ls.fixture_id),
          confidence: 'ls-only',
          slug,
        });
        if (error) log.warn(`provider-matcher: ls-only upsert failed for ${comp.id} ${ls.home_name} vs ${ls.away_name} (${kickoff}): ${error.message}`);
        else { total++; lsOk++; }
      }
      if (lsOk > 0) log.info(`provider-matcher: ${comp.id} — ${lsOk} ls-only fixture(s)`);
    }
  }

  if (total > 0) log.info(`provider-matcher: mapped ${total} fixture(s)`);
}
