/**
 * Auto-attach the odds-api.io event id at /pick time (Nick 12/6: "bot nên tự
 * gắn event id"). Picks are immutable after publish, so the id MUST be found
 * before insert. Conservative by design: attach only when the lookup matches
 * EXACTLY ONE event — ambiguity or any failure → null, the pick publishes with
 * fixture_id 0 and the Curator settles manually. Never throws, never blocks.
 */
import { log } from './log';

/** Giải dùng khi CHƯA lấy được danh sách từ kho — chỉ là lưới đỡ, không phải cấu hình. */
export const LOOKUP_LEAGUE = 'international-fifa-world-cup';

/** ── Vì sao có hàm này ──
 *  Trước đây chỗ tra mã trận GHIM CỨNG đúng một giải World Cup, kèm chú thích
 *  "đổi ở đây khi sang mùa mới" — và không ai đổi khi World Cup kết thúc. Hệ quả:
 *  mọi kèo giải câu lạc bộ (Ligue 1, Ngoại hạng Anh, Serie A…) tra không ra mã,
 *  rơi về fixture_id = 0, bộ chấm tự động bỏ qua, Nick phải gõ /score bằng tay.
 *  Đo 31/8/2026 trên 60 kèo gần nhất: 15 kèo không có mã, toàn giải CLB.
 *  Bảng competitions ĐÃ có sẵn cột odds_api_key cho từng giải đang bật — lấy từ đó
 *  thì hết ghim cứng, thêm giải mới cũng không phải sửa mã. */
let cacheGiai: Promise<string[]> | null = null;

/** Xoá bộ nhớ tạm — dùng trong bài kiểm. */
export function quenGiaiDangBat(): void {
  cacheGiai = null;
}

export async function layGiaiDangBat(
  doc: () => Promise<(string | null)[]>,
): Promise<string[]> {
  cacheGiai ??= (async () => {
    try {
      const ma = (await doc()).filter((x): x is string => Boolean(x));
      if (!ma.length) {
        log.warn('event lookup: bảng competitions không có giải nào đang bật — dùng giải mặc định');
        return [LOOKUP_LEAGUE];
      }
      return ma;
    } catch (err) {
      log.warn('event lookup: không đọc được bảng competitions, dùng giải mặc định:', err);
      return [LOOKUP_LEAGUE];
    }
  })();
  return cacheGiai;
}

/** How long the lookup may delay the confirmation reply before we give up. */
const LOOKUP_TIMEOUT_MS = 5_000;

/** Shape of one event in the odds-api.io /v3/events payload (fields we use). */
export interface ApiEvent {
  id: number;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  date: string; // ISO, e.g. "2026-06-12T19:00:00Z"
}

export interface MatchQuery {
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string; // ISO 8601
}

/** Result from event lookup — includes participant IDs for team logos (13/6). */
export interface EventMatch {
  id: number;
  homeId: number | null;
  awayId: number | null;
}

/** Lowercase, "&" → "and", strip diacritics + punctuation, collapse whitespace. */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Equal after normalization, or one contains the other ("Bosnia" ↔ "Bosnia and Herzegovina"). */
function teamMatches(apiName: string, inputName: string): boolean {
  const a = normalizeTeam(apiName);
  const b = normalizeTeam(inputName);
  if (a === '' || b === '') return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Same UTC calendar date — the Curator may type the kickoff hour slightly off. */
function sameUtcDate(eventDate: string, kickoffUtc: string): boolean {
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === kickoffUtc.slice(0, 10);
}

/**
 * Pure matcher: events list + pick info → event id, or null. Both teams must
 * match in home/away order AND the kickoff must fall on the same UTC date.
 * Returns the id only when EXACTLY one event matches (0 or 2+ → null).
 */
export function matchEvent(events: ApiEvent[], query: MatchQuery): number | null {
  const event = matchEventFull(events, query);
  return event?.id ?? null;
}

/** Like matchEvent but returns the full EventMatch including participant IDs (13/6: team logos). */
export function matchEventFull(events: ApiEvent[], query: MatchQuery): EventMatch | null {
  // Match teams in either order — odds-api home/away may differ from betting sites (Nick 13/6).
  const candidates = events.filter((e) =>
    ((teamMatches(e.home, query.homeTeam) && teamMatches(e.away, query.awayTeam)) ||
     (teamMatches(e.home, query.awayTeam) && teamMatches(e.away, query.homeTeam))) &&
    sameUtcDate(e.date, query.kickoffUtc),
  );
  if (candidates.length !== 1) return null;
  const e = candidates[0];
  return { id: e.id, homeId: e.homeId ?? null, awayId: e.awayId ?? null };
}

/**
 * Fetch the events list and find the unique match. Any HTTP/parse/timeout
 * error → log.warn + null. Never throws — a lookup failure must never block
 * pick publication.
 *
 * Returns the full EventMatch (id + participant IDs for team logos) since 13/6.
 */
async function layMotGiai(apiKey: string, giai: string): Promise<ApiEvent[]> {
  try {
    const res = await fetch(
      `https://api.odds-api.io/v3/events?sport=football&league=${giai}&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    );
    if (!res.ok) {
      log.warn(`event lookup: odds-api returned ${res.status} for league ${giai}`);
      return [];
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) {
      log.warn(`event lookup: unexpected payload for league ${giai} (not an array)`);
      return [];
    }
    return body as ApiEvent[];
  } catch (err) {
    log.warn(`event lookup: league ${giai} failed:`, err);
    return [];
  }
}

export async function findEvent(
  deps: { apiKey: string; leagues?: string[] },
  pick: MatchQuery,
): Promise<EventMatch | null> {
  // Hỏi MỌI giải đang bật cùng lúc rồi gộp kết quả. Chạy song song nên tổng thời
  // gian vẫn là một nhịp chờ, không nhân lên theo số giải. Giải nào hỏng thì trả
  // mảng rỗng, các giải còn lại vẫn chạy.
  const giai = deps.leagues?.length ? deps.leagues : [LOOKUP_LEAGUE];
  const dot = await Promise.all(giai.map((g) => layMotGiai(deps.apiKey, g)));
  const events = dot.flat();
  if (!events.length) {
    log.warn(`event lookup: không giải nào trả về sự kiện (${giai.length} giải đã hỏi)`);
    return null;
  }
  const event = matchEventFull(events, pick);
  if (event === null) {
    log.warn(`event lookup: no unambiguous event for ${pick.homeTeam} vs ${pick.awayTeam} on ${pick.kickoffUtc.slice(0, 10)} (đã hỏi ${giai.length} giải)`);
  }
  return event;
}

/** @deprecated Use findEvent() which returns full EventMatch with participant IDs. */
export async function findEventId(
  deps: { apiKey: string },
  pick: MatchQuery,
): Promise<number | null> {
  const event = await findEvent(deps, pick);
  return event?.id ?? null;
}
