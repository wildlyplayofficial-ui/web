/** Post a settled pick's result to the Telegram channel + audit it in channel_log. */
import type { Api } from 'grammy';
import { postToFacebook, pickVi } from './announce-pick';
import { buildRecapPosts, detectClosingLineFabrication } from './recap';
import { NGON_NGU } from './ngon-ngu';
import type { PickRow, Store } from './store';
import { log } from './log';

export interface AnnounceDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  store: Store;
  /** SETTLED card image (Post Restructure v1 §2.6): OG data-card in settled state,
   *  branded W/L/P banner as fallback — never text-only by design. */
  siteUrl?: string;
  /** FB result post — same fail-safe rule as the pick announce. */
  facebook?: { pageId: string; pageToken: string };
  /** Milestone 4: optional AI recap generator — failures must never break the announcement.
   *  Post Restructure v1 (R6): recap text is web-only now, no extra TG notification. */
  recap?: (pick: PickRow) => Promise<string | null>;
  /** Decision #19: optional long-form newsroom article generator; falls back to the channel recap text. */
  recapArticle?: (pick: PickRow) => Promise<string | null>;
}

const STATUS_VI: Record<string, string> = {
  won: '\u2705 NHẬN ĐỊNH ĐÚNG',
  lost: '\u274c CHƯA TRÚNG',
  push: '\u{1F7E1} HÒA — KHÔNG TÍNH',
  void: '\u26aa HỦY',
};

/** VI-safe: 5 trạng thái settle gộp về đúng/chưa trúng/hòa (bỏ half-win/half-loss của kèo AH). */
const OUTCOME_VI: Record<string, string> = {
  win: '\u2705 NHẬN ĐỊNH ĐÚNG',
  half_win: '\u2705 NHẬN ĐỊNH ĐÚNG',
  push: '\u{1F7E1} HÒA — KHÔNG TÍNH',
  half_loss: '\u274c CHƯA TRÚNG',
  loss: '\u274c CHƯA TRÚNG',
};

/** Branded settled banner per status (§2.6 image table, fallback when OG card fails). */
const SETTLED_IMAGES: Record<string, string> = {
  won: 'banhbong_settled_win.png',
  lost: 'banhbong_settled_loss.png',
  push: 'banhbong_settled_push.png',
};

export interface RecordSummary { wins: number; losses: number; pushes: number; units: number }

export function summarizeRecord(settled: PickRow[]): RecordSummary {
  return {
    wins: settled.filter((p) => p.status === 'won').length,
    losses: settled.filter((p) => p.status === 'lost').length,
    pushes: settled.filter((p) => p.status === 'push').length,
    units: settled.reduce((sum, p) => sum + Number(p.units_pl ?? 0), 0),
  };
}

export function formatUnits(n: number): string {
  // 3 dp: quarter-stakes on half-states settle at .125 precision (spec §2.3 example: −0.125u).
  const rounded = Math.round(n * 1000) / 1000;
  return `${rounded > 0 ? '+' : ''}${rounded}u`;
}

/** Thẻ KẾT QUẢ — khuôn Nick chốt 29/8:
 *
 *    ✅ NHẬN ĐỊNH ĐÚNG — Liverpool vs Nottingham Forest
 *
 *    👉 Over 2.5 bàn · Kết quả: 2-2
 *
 *    Link recap: https://.../analysis/recap-liverpool-vs-nottingham-forest-2-2
 *
 *  Nick bỏ dòng "Thành tích" và dòng công bố. Dòng công bố còn đang SAI: nó dùng
 *  hằng cắm cứng bản "người thật", không rẽ theo `author`, nên pick của Trợ lý AI
 *  bị dán nhãn người thật. Bỏ hẳn là hết cả hai chuyện.
 *
 *  Đường dẫn recap dùng `/analysis/` — đó mới là bản canonical; `/news/` cũng trả
 *  200 nhưng canonical của nó trỏ về `/analysis/`.
 *
 *  `html` = true khi gửi Telegram (in đậm hai dòng chính). Facebook không có chữ
 *  đậm nên gọi với false. */
export function formatResultMessage(pick: PickRow, siteUrl?: string, html = false): string {
  const badge = (pick.raw_outcome && OUTCOME_VI[pick.raw_outcome])
    ?? STATUS_VI[pick.status] ?? pick.status;
  const esc = (t: string) => (html ? t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : t);
  const dam = (t: string) => (html ? `<b>${esc(t)}</b>` : t);
  const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const recap = siteUrl
    ? `${siteUrl}/analysis/recap-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.home_score}-${pick.away_score}`
    : null;
  return [
    dam(`${badge} \u2014 ${pick.home_team} vs ${pick.away_team}`),
    '',
    dam(`\u{1F449} ${pickVi(pick)} \u00b7 K\u1ebft qu\u1ea3: ${pick.home_score}-${pick.away_score}`),
    ...(recap ? ['', `Link recap: ${recap}`] : []),
  ].join('\n');
}


/** POST a photo to the FB Page. Returns the FB object id; throws on API error. */
export async function postPhotoToFacebook(
  fb: { pageId: string; pageToken: string },
  imageUrl: string,
  caption: string,
): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${fb.pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, caption, access_token: fb.pageToken }),
  });
  const body = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`FB photo post failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
  return body.id ?? '';
}

/** Đăng Story lên FB Page: upload ảnh published=false rồi publish qua /photo_stories
 *  (flow chạy tay thành công cho pick Hull-MU 22/8 — nay tự động). Throws on API error. */
export async function postFacebookStory(
  fb: { pageId: string; pageToken: string },
  imageUrl: string,
): Promise<string> {
  const up = await fetch(`https://graph.facebook.com/v19.0/${fb.pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, published: false, access_token: fb.pageToken }),
  });
  const upBody = (await up.json()) as { id?: string; error?: { message?: string } };
  if (!up.ok || upBody.error || !upBody.id) {
    throw new Error(`FB story photo upload failed: ${upBody.error?.message ?? `HTTP ${up.status}`}`);
  }
  const res = await fetch(`https://graph.facebook.com/v19.0/${fb.pageId}/photo_stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: upBody.id, access_token: fb.pageToken }),
  });
  const body = (await res.json()) as { post_id?: string; error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`FB story publish failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
  return body.post_id ?? '';
}

/** R7: SETTLED carries the OG data-card in settled state (WIN/LOSS/PUSH badge + updated record). */
export function resultCardUrl(siteUrl: string, pick: PickRow): string {
  // lang=vi: same as announce-pick.ts — without it the result announce shipped the
  // ENGLISH card (and a stale CDN copy of it). Jane caught this live on /score 22/8.
  return `${siteUrl}/api/og/play/${pick.id}?lang=vi`;
}

export async function announceResult(deps: AnnounceDeps, pick: PickRow): Promise<void> {
  if (!deps.channelChatId) {
    log.warn(`CHANNEL_CHAT_ID unset — skipping channel announcement for pick ${pick.id}`);
    return;
  }

  // Dedup guard: skip if this pick already has a result announcement in channel_log.
  if (await deps.store.hasChannelLog(pick.id, 'telegram', 'result')) {
    log.info(`skipping duplicate announce for pick ${pick.id} — already in channel_log`);
    return;
  }

  const textTg = formatResultMessage(pick, deps.siteUrl, true);
  const text = formatResultMessage(pick, deps.siteUrl, false);
  const cardUrl = deps.siteUrl ? resultCardUrl(deps.siteUrl, pick) : null;
  const brandUrl = deps.siteUrl && SETTLED_IMAGES[pick.status]
    ? `${deps.siteUrl}/images/${SETTLED_IMAGES[pick.status]}` : null;

  // OG settled card → branded W/L/P banner → plain text (unconditional fallback).
  let msgId: number;
  let detail = `result ${pick.status} ${pick.units_pl}u`;
  try {
    if (!cardUrl) throw new Error('no siteUrl');
    const photoMsg = await deps.api.sendPhoto(deps.channelChatId, cardUrl, { caption: textTg, parse_mode: 'HTML' as const });
    msgId = photoMsg.message_id;
    detail += ' (card)';
  } catch (err) {
    if (cardUrl) log.warn(`result card photo failed for pick ${pick.id} — trying branded banner:`, err);
    try {
      if (!brandUrl) throw new Error('no brand image');
      const photoMsg = await deps.api.sendPhoto(deps.channelChatId, brandUrl, { caption: textTg, parse_mode: 'HTML' as const });
      msgId = photoMsg.message_id;
      detail += ' (banner)';
    } catch {
      msgId = (await deps.api.sendMessage(deps.channelChatId, textTg, { parse_mode: 'HTML' as const })).message_id;
    }
  }
  await deps.store.insertChannelLog({
    pick_id: pick.id,
    channel: 'telegram',
    external_id: String(msgId),
    ok: true,
    detail,
  });
  log.info(`announced result for pick ${pick.id} to channel ${deps.channelChatId}`);

  // FB result post (fail-safe: never blocks the rest of the announcement).
  // §3: branded W/L/P banner as hero; OG card would underperform as FB hero.
  if (deps.facebook && deps.siteUrl) {
    try {
      let fbId: string;
      try {
        fbId = await postPhotoToFacebook(deps.facebook, brandUrl ?? cardUrl!, text);
      } catch (err) {
        log.warn(`FB result card failed for pick ${pick.id} — falling back to link post:`, err);
        fbId = await postToFacebook(deps.facebook, text, `${deps.siteUrl}/play/${pick.id}`);
      }
      await deps.store.insertChannelLog({
        pick_id: pick.id,
        channel: 'facebook',
        external_id: fbId,
        ok: true,
        detail: `result ${pick.status}`,
      });
      log.info(`announced result for pick ${pick.id} to Facebook (${fbId})`);
    } catch (err) {
      log.warn(`facebook result announce failed for pick ${pick.id} — channel already announced:`, err);
    }
  }

  // Post Restructure v1 (R6): recap/post-mortem content is web-only — published to the
  // newsroom, no extra TG/FB notification here (POST-MORTEM announce fires separately
  // when the 4-lang article is live).
  if (!deps.recap) return;
  try {
    const text = await deps.recap(pick);
    if (text === null) return;
    try {
      const articleText = (await deps.recapArticle?.(pick)) ?? text;
      const recapPosts = buildRecapPosts(pick, articleText);
      // Chỉ tiếng Việt: guard chạy trên section chính (heuristic gốc viết cho EN — xem PR).
      const enPost = recapPosts.find((p) => p.lang === NGON_NGU[0]);
      const fabrication = enPost ? detectClosingLineFabrication(pick.odds_close, enPost.body_md) : null;
      if (fabrication) {
        log.warn(`recap: blocked publish for pick ${pick.id} — ${fabrication}`);
        return;
      }
      for (const post of recapPosts) {
        await deps.store.insertPost(post);
      }
      log.info(`published recap posts for pick ${pick.id}`);
    } catch (err) {
      log.warn(`recap post storage failed for pick ${pick.id} — result already announced:`, err);
    }
  } catch (err) {
    log.warn(`recap step failed for pick ${pick.id} — result already announced:`, err);
  }
}
