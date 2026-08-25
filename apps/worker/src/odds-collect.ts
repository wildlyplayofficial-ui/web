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
  // Nick chốt thêm Liga MX 25/8. Slug lấy từ /v3/leagues chứ không gõ theo trí
  // nhớ — gõ sai thì job im lặng bỏ cả giải, không báo lỗi gì.
  //
  // ⚠️ THÁNG 1: Liga MX chia hai lượt, Apertura (7–12) và Clausura (1–5). Hết
  // Apertura là slug này cạn trận, phải đổi sang 'mexico-liga-mx-clausura'
  // (slug đó CHƯA tồn tại lúc 25/8, nhà cung cấp tạo khi tới mùa).
  ['mexico-liga-mx-apertura', 'ligamx-2026'],
  // Cúp C1 TRƯỚC GIỜ KHÔNG NẰM TRONG CRON — chỉ có trong collect-odds.mjs chạy
  // tay. Nên kèo C1 trên bảng là ảnh chụp cũ của lần chạy tay, trận mới không
  // bao giờ có kèo (Gwen tìm ra 25/8 khi truy trận C1 thứ 7 bị thiếu).
  //
  // ⚠️ Slug theo TỪNG VÒNG, không phải cả giải: hết vòng play-off (26/8) là
  // slug này cạn trận, vòng phân hạng tháng 9 mang slug khác. Cùng loại bẫy
  // với Apertura/Clausura ở trên.
  ['international-clubs-uefa-champions-league-playoff-round', 'ucl-2026'],
];

// Toàn trận + HIỆP 1. Nick 25/8 muốn bảng kèo đủ cột như trang nhà cái quen
// thuộc: chấp/tài xỉu/1X2 cho cả toàn trận lẫn hiệp 1. Tên thị trường hiệp 1
// bên odds-api.io là "<tên> HT" (Jane tra thẳng /v3/markets 25/8).
//
// LƯU Ý: kèo quá khứ KHÔNG mua lại được. Ba thị trường HT chỉ có dữ liệu từ lúc
// bật trở đi, nên vài ngày đầu cột hiệp 1 sẽ thưa hơn cột toàn trận — không phải lỗi.
const MARKETS = new Set([
  'ML', 'Spread', 'Totals', 'European Handicap',
  'ML HT', 'Spread HT', 'Totals HT',
]);
/** Trận xa hơn 4 ngày kèo còn loãng và tốn lượt gọi (giới hạn 100/giờ). */
const HORIZON_MS = 96 * 3_600_000;

export interface OddsRow {
  event_id: number;
  competition_id: string;
  home_team: string;
  away_team: string;
  /** Mã đội của nhà cung cấp — dùng lấy logo qua /api/team-logo/[id].
   *  Ghép logo theo TÊN chỉ khớp 11/40 đội và từng gán nhầm "Sabah Masazir"
   *  vào logo "Sabah" (hai CLB khác nước), nên phải lưu mã. */
  home_id: number | null;
  away_id: number | null;
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

interface OddsEvent { id: number; home: string; away: string; date: string; homeId?: number; awayId?: number }
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
        home_id: event.homeId ?? null,
        away_id: event.awayId ?? null,
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
  /** Một hoặc nhiều khoá API. Nhiều khoá thì gặp 429 sẽ đổi sang khoá kế. */
  apiKey: string | string[];
  /** Supabase client — chỉ dùng .from().insert(), giữ hẹp để test dễ. */
  store: { from: (t: string) => { insert: (rows: OddsRow[]) => Promise<{ error: { message: string } | null }> } };
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Gọi sau khi ghi xong để bảng kèo hiện ngay, khỏi chờ hết 15 phút đệm. */
  revalidate?: (tags: string[]) => Promise<void>;
}

/** Đếm số nhịp LIÊN TIẾP một giải trả về 0 trận sắp đá.
 *
 *  Vì sao cần: slug giải của nhà cung cấp gắn theo MÙA và theo VÒNG. Hết mùa là
 *  slug cạn trận, API vẫn trả 200, không có lỗi nào — giải cứ thế lặng lẽ biến
 *  mất khỏi bảng kèo. Đúng cách Cúp C1 bị rớt mà không ai biết (Gwen tìm ra
 *  25/8), và tháng 1 Liga MX đổi Apertura sang Clausura sẽ dính y hệt.
 *
 *  log.warn có tiền tố "odds-collect:" nên tự chảy vào đường cảnh báo sẵn có
 *  (onWarn → trackFailure trong index.ts), không cần dựng kênh báo mới. */
const nhipRong = new Map<string, number>();

/** Bao nhiêu nhịp liên tiếp thì kêu. 3 nhịp × 3 tiếng = 9 tiếng — đủ dài để bỏ
 *  qua quãng nghỉ giữa tuần bình thường, đủ ngắn để không mất cả mùa giải. */
const NGUONG_RONG = 3;

/** Ghi nhận một giải vừa thu được bao nhiêu trận; kêu khi rỗng quá lâu. */
export function ghiNhanSoTran(slug: string, soTran: number): void {
  if (soTran > 0) {
    nhipRong.delete(slug);
    return;
  }
  const lan = (nhipRong.get(slug) ?? 0) + 1;
  nhipRong.set(slug, lan);
  if (lan === NGUONG_RONG) {
    log.warn(
      `odds-collect: giải "${slug}" đã ${lan} nhịp liền KHÔNG có trận nào. ` +
      `Nhiều khả năng slug hết mùa/hết vòng — tra lại /v3/leagues rồi cập nhật ODDS_LEAGUES.`,
    );
  }
}

/** Chỉ dùng trong test — xoá bộ đếm giữa các ca. */
export function xoaBoDemRong(): void {
  nhipRong.clear();
}

/** Một nhịp thu thập. KHÔNG BAO GIỜ throw — kèo hỏng không được phép làm chết worker. */
export async function collectOddsTick(deps: Deps): Promise<number> {
  const f = deps.fetchImpl ?? fetch;
  const now = (deps.now ?? Date.now)();
  // Nhà cung cấp chặn ở 100 lượt/giờ MỖI KHOÁ. Một nhịp thu quét ~20 trận + 1
  // lượt/giải nên đã sát trần — Nick 25/8 thấy trận Cúp C1 rớt vì lý do này.
  // Có nhiều khoá thì gặp 429 chuyển sang khoá kế rồi gọi lại, thay vì bỏ trận.
  const khoa = (Array.isArray(deps.apiKey) ? deps.apiKey : [deps.apiKey]).filter(Boolean);
  if (khoa.length === 0) {
    log.warn('odds-collect: không có khoá API nào — bỏ nhịp này');
    return 0;
  }
  let i = 0;
  const api = async (path: string): Promise<unknown> => {
    // Thử lần lượt từng khoá; chỉ đổi khoá khi bị chặn vì hết lượt (429).
    for (let lan = 0; lan < khoa.length; lan++) {
      const res = await f(`https://api.odds-api.io/v3/${path}&apiKey=${khoa[i]}`);
      if (res.ok) return res.json();
      if (res.status !== 429) throw new Error(`odds-api ${res.status}`);
      log.warn(`odds-collect: khoá ${i + 1}/${khoa.length} hết lượt, đổi khoá`);
      i = (i + 1) % khoa.length;
    }
    throw new Error('odds-api 429 — mọi khoá đều hết lượt');
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
    ghiNhanSoTran(slug, upcoming.length);
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
  // Bảng kèo đệm 15 phút. Không gọi chỗ này thì kèo vừa thu phải chờ hết đệm
  // mới lên trang — Nick 25/8 vào xem ngay sau khi deploy vẫn thấy bảng cũ.
  if (written > 0 && deps.revalidate) await deps.revalidate(['odds']);
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
