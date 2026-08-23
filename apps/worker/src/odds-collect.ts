/**
 * Thu thập kèo Bet365 cho các trận sắp đá → bảng odds_snapshots.
 *
 * Vì sao lưu snapshot: nhà cung cấp XOÁ kèo ngay khi trận đá xong (Nick 23/8),
 * nên kèo quá khứ không mua lại được. Mỗi nhịp ghi thêm một lớp, để trang kèo
 * vẽ được đường đi của kèo từ lúc mở tới giờ bóng lăn — thứ đối thủ không có.
 *
 * Nhịp 3 tiếng (Nick chốt). Lấy 4 loại kèo dùng cho trang; 115 loại phụ (góc,
 * thẻ, kèo cầu thủ) bỏ qua để bảng không phình vô ích.
 */
import { log } from './log';

export const ODDS_LEAGUES: ReadonlyArray<readonly [slug: string, competitionId: string]> = [
  ['england-premier-league', 'epl-2026'],
  ['spain-laliga', 'laliga-2026'],
  ['italy-serie-a', 'seriea-2026'],
  ['germany-bundesliga', 'bundesliga-2026'],
  ['france-ligue-1', 'ligue1-2026'],
];

const MARKETS = new Set(['ML', 'Spread', 'Totals', 'European Handicap']);
/** Trận xa hơn 4 ngày kèo còn loãng và tốn lượt gọi (giới hạn 100/giờ). */
const HORIZON_MS = 96 * 3_600_000;

export interface OddsRow {
  event_id: number;
  competition_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  bookmaker: string;
  market: string;
  hdp: number | null;
  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;
  over_odds: number | null;
  under_odds: number | null;
  source_updated_at: string | null;
}

interface OddsEvent { id: number; home: string; away: string; date: string }
interface OddsMarket { name: string; updatedAt?: string; odds?: Record<string, unknown>[] }

const num = (v: unknown): number | null =>
  v === undefined || v === null || v === '' ? null : Number(v);

/** Ghép payload một trận thành các dòng snapshot. Pure — test được không cần mạng. */
export function buildOddsRows(
  event: OddsEvent, competitionId: string, markets: OddsMarket[],
): OddsRow[] {
  const rows: OddsRow[] = [];
  for (const m of markets) {
    if (!MARKETS.has(m.name)) continue;
    for (const o of m.odds ?? []) {
      rows.push({
        event_id: event.id,
        competition_id: competitionId,
        home_team: event.home,
        away_team: event.away,
        kickoff_utc: event.date,
        bookmaker: 'Bet365',
        market: m.name,
        hdp: num(o.hdp),
        home_odds: num(o.home),
        draw_odds: num(o.draw),
        away_odds: num(o.away),
        over_odds: num(o.over),
        under_odds: num(o.under),
        source_updated_at: m.updatedAt ?? null,
      });
    }
  }
  return rows;
}

/** Xác suất thực sau khi bóc phần nhà cái giữ lại (Nick 23/8: cái đối thủ không hiện).
 *  Trả null khi thiếu kèo hoặc kèo lỗi. Pure. */
export function trueProbabilities(
  home: number | null, draw: number | null, away: number | null,
): { home: number; draw: number; away: number; margin: number } | null {
  if (!home || !draw || !away || home <= 1 || draw <= 1 || away <= 1) return null;
  const raw = [1 / home, 1 / draw, 1 / away];
  const total = raw[0] + raw[1] + raw[2];
  if (total <= 0) return null;
  return {
    home: raw[0] / total,
    draw: raw[1] / total,
    away: raw[2] / total,
    margin: total - 1,
  };
}

interface Deps {
  apiKey: string;
  /** Supabase client — chỉ dùng .from().insert(), giữ hẹp để test dễ. */
  store: { from: (t: string) => { insert: (rows: OddsRow[]) => Promise<{ error: { message: string } | null }> } };
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/** Một nhịp thu thập. KHÔNG BAO GIỜ throw — kèo hỏng không được phép làm chết worker. */
export async function collectOddsTick(deps: Deps): Promise<number> {
  const f = deps.fetchImpl ?? fetch;
  const now = (deps.now ?? Date.now)();
  const api = async (path: string): Promise<unknown> => {
    const res = await f(`https://api.odds-api.io/v3/${path}&apiKey=${deps.apiKey}`);
    if (!res.ok) throw new Error(`odds-api ${res.status}`);
    return res.json();
  };

  const rows: OddsRow[] = [];
  for (const [slug, compId] of ODDS_LEAGUES) {
    let events: OddsEvent[];
    try {
      events = (await api(`events?sport=football&league=${slug}`)) as OddsEvent[];
    } catch (err) {
      log.warn(`odds-collect: bỏ ${slug} — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    const upcoming = events.filter((e) => {
      const t = new Date(e.date).getTime();
      return t > now && t < now + HORIZON_MS;
    });
    for (const ev of upcoming) {
      try {
        const data = (await api(`odds?eventId=${ev.id}&bookmakers=Bet365`)) as
          { bookmakers?: Record<string, OddsMarket[]> };
        const markets = data?.bookmakers?.Bet365 ?? [];
        rows.push(...buildOddsRows(ev, compId, markets));
      } catch (err) {
        log.warn(`odds-collect: bỏ trận ${ev.home} vs ${ev.away} — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (rows.length === 0) {
    log.warn('odds-collect: không lấy được dòng nào nhịp này');
    return 0;
  }
  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await deps.store.from('odds_snapshots').insert(rows.slice(i, i + 500));
    if (error) {
      log.warn(`odds-collect: ghi lỗi — ${error.message}`);
      break;
    }
    written += Math.min(500, rows.length - i);
  }
  log.info(`odds-collect: ghi ${written} dòng kèo`);
  return written;
}

export const ODDS_INTERVAL_MS = 3 * 3_600_000;

/** Bật nhịp thu thập. Trả hàm dừng (cho test/tắt máy). */
export function startOddsCollector(deps: Deps): () => void {
  const tick = () => void collectOddsTick(deps).catch((err) => log.warn('odds-collect tick:', err));
  const timer = setInterval(tick, ODDS_INTERVAL_MS);
  tick(); // nhịp đầu chạy ngay — mỗi giờ chậm là mất một lát cắt kèo
  log.info('odds-collect: cron started (mỗi 3 tiếng, Bet365)');
  return () => clearInterval(timer);
}
