/**
 * Làm mới ảnh của một pick trên MỌI kênh đã đăng.
 *
 * Vì sao có file này: 29/8 sửa thẻ pick xong phải đi thay ảnh tay ở Telegram và
 * Facebook. Làm tay thì lần nào cũng sót một bước — lần đó sót caption, tin pick
 * Liverpool mất sạch chữ chỉ còn ảnh. Nick chốt: *"Làm thành app chứ làm dựa theo
 * trí nhớ thì không lần nào giống lần nào"*.
 *
 * Ba bẫy đã trả giá, nay nằm trong mã chứ không nằm trong đầu ai:
 *  1. `editMessageMedia` THAY CẢ KHỐI media — không truyền caption là Telegram xoá
 *     caption. Luôn gửi kèm caption + parse_mode.
 *  2. Cùng một URL ảnh thì Telegram trả lại ảnh nó đã nhớ. Phải có đuôi `v=` khác.
 *  3. Facebook quét trang một lần rồi giữ ảnh đó mãi. Phải gọi `scrape=true`.
 */
import type { Api } from 'grammy';
import { formatPickMessage } from './announce-pick';
import { formatResultMessage, linkXemLai } from './announce';
import type { PickRow, Store } from './store';
import { log } from './log';

export interface LamMoiDeps {
  api: Pick<Api, 'editMessageMedia' | 'editMessageCaption'>;
  store: Store;
  channelChatId: string | undefined;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
  /** Chỉ để test bơm giờ vào — mã thật lấy Date.now(). */
  now?: () => number;
}

export interface BuocLamMoi {
  buoc: string;
  xong: boolean;
  ghiChu: string;
}

const daCham = (pick: PickRow): boolean =>
  pick.status === 'won' || pick.status === 'lost' || pick.status === 'push';

/** Caption đúng kênh. Telegram giữ link trong chữ (Nick + Jane chốt 29/8). */
function captionTelegram(pick: PickRow, siteUrl: string): string {
  return daCham(pick)
    ? formatResultMessage(pick, siteUrl, true)
    : formatPickMessage(pick, siteUrl, {}, true);
}

/** Bảo Facebook quét lại một đường dẫn để nó bỏ ảnh cũ đang nhớ. */
async function quetLai(
  fb: { pageId: string; pageToken: string },
  url: string,
): Promise<void> {
  const res = await fetch('https://graph.facebook.com/v19.0/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: url, scrape: true, access_token: fb.pageToken }),
  });
  const body = (await res.json()) as { error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`FB scrape failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
}

/**
 * Chạy đủ các bước làm mới. KHÔNG ném lỗi: bước nào hỏng thì ghi vào báo cáo,
 * các bước còn lại vẫn chạy — hỏng Facebook không được kéo theo hỏng Telegram.
 */
export async function lamMoiBai(deps: LamMoiDeps, pick: PickRow): Promise<BuocLamMoi[]> {
  const bao: BuocLamMoi[] = [];
  const v = (deps.now ?? Date.now)();
  // Đuôi v khác nhau mỗi lần chạy — thiếu nó là Telegram trả lại đúng ảnh cũ.
  const anhThe = `${deps.siteUrl}/api/og/play/${pick.id}?lang=vi&v=${v}`;

  const logs = await deps.store.listChannelLogs(pick.id);
  const tinTg = logs.find((l) => l.channel === 'telegram' && l.ok && l.external_id);
  const baiFb = logs.find((l) => l.channel === 'facebook' && l.ok && l.external_id);

  if (!deps.channelChatId) {
    bao.push({ buoc: 'telegram', xong: false, ghiChu: 'chưa cắm CHANNEL_CHAT_ID' });
  } else if (!tinTg) {
    bao.push({ buoc: 'telegram', xong: false, ghiChu: 'chưa có tin nào đã đăng' });
  } else {
    try {
      await deps.api.editMessageMedia(deps.channelChatId, Number(tinTg.external_id), {
        type: 'photo',
        media: anhThe,
        // ĐỪNG BỎ hai dòng này: editMessageMedia thay cả khối, thiếu caption là mất chữ.
        caption: captionTelegram(pick, deps.siteUrl),
        parse_mode: 'HTML',
      });
      bao.push({ buoc: 'telegram', xong: true, ghiChu: `tin ${tinTg.external_id} — ảnh + chữ` });
    } catch (err) {
      bao.push({ buoc: 'telegram', xong: false, ghiChu: String(err) });
      log.warn(`lammoi: telegram hỏng cho ${pick.id}:`, err);
    }
  }

  if (!deps.facebook) {
    bao.push({ buoc: 'facebook', xong: false, ghiChu: 'chưa cắm trang Facebook' });
  } else {
    // Quét lại MỌI đường dẫn của trận này. Bài kết quả và trang pick là hai trang
    // khác nhau, Facebook nhớ ảnh riêng cho từng cái.
    const duongDan = [`${deps.siteUrl}/play/${pick.id}`];
    const xemLai = daCham(pick) ? linkXemLai(pick, deps.siteUrl) : null;
    if (xemLai) duongDan.push(xemLai);
    for (const url of duongDan) {
      try {
        await quetLai(deps.facebook, url);
        bao.push({ buoc: 'facebook', xong: true, ghiChu: `quét lại ${url}` });
      } catch (err) {
        bao.push({ buoc: 'facebook', xong: false, ghiChu: `${url} — ${String(err)}` });
        log.warn(`lammoi: FB scrape hỏng cho ${url}:`, err);
      }
    }
    if (!baiFb) {
      // Không chặn: quét lại vẫn có ích cho link dán tay. Chỉ nói rõ để khỏi tưởng xong hết.
      bao.push({ buoc: 'facebook', xong: false, ghiChu: 'chưa có bài nào trong sổ — ảnh trong bài đã đăng KHÔNG thay được, phải xoá đăng lại' });
    }
  }

  return bao;
}

/** Báo cáo một dòng mỗi bước, đọc trên điện thoại được. */
export function bangBaoCao(pick: PickRow, bao: BuocLamMoi[]): string {
  const dong = bao.map((b) => `${b.xong ? '✅' : '❌'} ${b.buoc}: ${b.ghiChu}`);
  return [`🔄 Làm mới ${pick.home_team} vs ${pick.away_team}`, '', ...dong].join('\n');
}
