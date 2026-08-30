/**
 * Canh kèo TREO — kèo đã đá xong mà không ai chấm điểm.
 *
 * Vì sao có file này: bộ tự chấm (poll.ts) bỏ qua hai loại kèo và CHỈ ghi một dòng
 * nhật ký, không ai đọc:
 *   1. `fixture_id <= 0` — không tra ra mã trận lúc tạo kèo, máy không dò được tỉ
 *      số. Tính tới 29/8 có 13 trên 43 kèo rơi vào loại này.
 *   2. quá 8 tiếng kể từ giờ đá — poll bỏ cuộc, kể cả kèo CÓ mã trận.
 *
 * Kèo treo thì thành tích không cộng, mà trang vẫn ghi "SẮP ĐÁ" — sai âm thầm.
 * Nick 29/8: *"Làm thành app chứ làm dựa theo trí nhớ thì không lần nào giống
 * lần nào"*. Nên thay vì dặn người nhớ, máy tự nhắn.
 *
 * Nhắn ĐÚNG MỘT LẦN cho mỗi kèo: dấu vết ghi vào channel_log, khởi động lại
 * worker cũng không nhắn lại.
 */
import type { Store, PickRow } from './store';
import { log } from './log';

/** Sau giờ đá bao lâu thì coi là treo. 3 tiếng: trận 90 phút cộng bù giờ, nghỉ
 *  giữa hiệp và chờ nguồn cập nhật vẫn dư. */
export const NGUONG_TREO_MS = 3 * 3_600_000;
/** Poll bỏ cuộc sau 8 tiếng — trùng WINDOW_END_MS bên poll.ts. */
export const POLL_BO_CUOC_MS = 8 * 3_600_000;

const DAU_VET = 'keo-treo';

export interface CanhDeps {
  store: Store;
  /** Gửi tin cho một người. Trả về lỗi thì bỏ qua người đó, không chặn người khác. */
  guiTin: (chatId: string, text: string) => Promise<unknown>;
  /** Ai nhận nhắc — mặc định lấy danh sách người được phép dùng bot. */
  nguoiNhan: string[];
}

/**
 * Kèo treo = đã published, quá ngưỡng giờ, VÀ poll chắc chắn không cứu được nữa.
 *
 * Điều kiện thứ hai quan trọng: kèo có mã trận và mới quá giờ 3 tiếng thì poll
 * VẪN đang thử, nhắc lúc đó là báo động giả. Chỉ nhắc khi máy hết cửa:
 * không có mã trận, hoặc đã quá cửa sổ 8 tiếng của poll.
 */
export function locKeoTreo(picks: PickRow[], now: Date): PickRow[] {
  return picks.filter((p) => {
    if (p.status !== 'published') return false;
    const tuoi = now.getTime() - new Date(p.kickoff_utc).getTime();
    if (tuoi < NGUONG_TREO_MS) return false;
    return p.fixture_id <= 0 || tuoi > POLL_BO_CUOC_MS;
  });
}

/** Một kèo một dòng, gõ /score copy được ngay. */
export function loiNhac(pick: PickRow, now: Date): string {
  const gio = Math.floor((now.getTime() - new Date(pick.kickoff_utc).getTime()) / 3_600_000);
  const vi = pick.fixture_id <= 0
    ? 'không có mã trận nên máy KHÔNG tự chấm được'
    : 'quá cửa sổ 8 tiếng, máy đã bỏ cuộc';
  return [
    '⏳ KÈO TREO — đá xong rồi mà chưa chấm điểm',
    '',
    `${pick.home_team} vs ${pick.away_team}`,
    `${pick.selection} · ${pick.league}`,
    `Đá xong ${gio} tiếng trước · ${vi}`,
    '',
    'Chấm bằng lệnh này, thay tỉ số vào:',
    `/score ${pick.id} 0-0`,
  ].join('\n');
}

/** Quét một lượt. KHÔNG ném lỗi — canh hỏng không được kéo worker chết theo. */
export async function canhKeoTreo(deps: CanhDeps, now: Date = new Date()): Promise<PickRow[]> {
  let treo: PickRow[];
  try {
    treo = locKeoTreo(await deps.store.listByStatus(['published']), now);
  } catch (err) {
    log.warn('canh kèo treo: đọc kho hỏng:', err);
    return [];
  }
  const daNhac: PickRow[] = [];
  for (const pick of treo) {
    try {
      if (await deps.store.hasChannelLog(pick.id, 'telegram', DAU_VET)) continue;
      const text = loiNhac(pick, now);
      let guiDuoc = false;
      for (const ai of deps.nguoiNhan) {
        try {
          await deps.guiTin(ai, text);
          guiDuoc = true;
        } catch (err) {
          log.warn(`canh kèo treo: gửi cho ${ai} hỏng:`, err);
        }
      }
      // CHỈ ghi dấu vết khi đã gửi được cho ít nhất một người. Ghi sớm là kèo
      // treo im lặng luôn — đúng cái lỗi file này sinh ra để chữa.
      if (!guiDuoc) continue;
      await deps.store.insertChannelLog({
        pick_id: pick.id, channel: 'telegram', ok: true, detail: DAU_VET,
      });
      daNhac.push(pick);
      log.info(`canh kèo treo: đã nhắc pick ${pick.id}`);
    } catch (err) {
      log.warn(`canh kèo treo: pick ${pick.id} hỏng:`, err);
    }
  }
  return daNhac;
}
