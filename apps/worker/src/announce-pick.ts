/**
 * Announce a freshly published pick to the TG channel + Facebook Page
 * (3-point plan Nick OK'd 12/6 — replaces the n8n v14 posting flow).
 * A failed announcement must NEVER break the pick publication.
 */
import type { Api } from 'grammy';
import { authorTypeOf, type PickRow, type Store } from './store';
import { log } from './log';

export interface AnnouncePickDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  store: Store;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
}

/** Post Restructure v1: card extras parsed from /pick but not persisted on the row. */
export interface PickCardExtras {
  /** Hand-written one-line hook (R5). Omitted from the card when absent — never auto-filled. */
  hook?: string | null;
  /** ⚠️ against-the-market cue on the confidence line (R3). */
  againstMarket?: boolean;
}

/** Legacy constant — Curator footer only. Used by digest.ts and announce.ts for non-pick-specific cards. */
export const CARD_FOOTER = '\u2014 Nh\u1eadn \u0111\u1ecbnh c\u1ee7a ng\u01b0\u1eddi th\u1eadt \u00b7 Ch\u1ec9 mang t\u00ednh tham kh\u1ea3o';

/** D\u00f2ng c\u00f4ng b\u1ed1 theo author_type \u2014 ti\u1ebfng Vi\u1ec7t, VI-safe (b\u1ecf "odds/not financial advice").
 *  Scout = AI, Curator = ng\u01b0\u1eddi th\u1eadt (Bug A: Scout ph\u1ea3i ghi r\u00f5 do AI). */
export function cardFooter(pick: PickRow): string {
  const at = authorTypeOf(pick.author);
  return at === 'fictional_ai'
    ? '\u2014 Nh\u1eadn \u0111\u1ecbnh do AI th\u1ef1c hi\u1ec7n \u00b7 Ch\u1ec9 mang t\u00ednh tham kh\u1ea3o'
    : '\u2014 Nh\u1eadn \u0111\u1ecbnh c\u1ee7a ng\u01b0\u1eddi th\u1eadt \u00b7 Ch\u1ec9 mang t\u00ednh tham kh\u1ea3o';
}

/** Tên giải tiếng Việt cho caption. Không có trong map → giữ nguyên tên gốc. */
const LEAGUE_VI: Record<string, string> = {
  'Premier League': 'Ngoại hạng Anh',
  'Champions League': 'Cúp C1 châu Âu',
  'Europa League': 'Cúp C2 châu Âu',
  'Europa Conference League': 'Cúp C3 châu Âu',
  'FA Cup': 'Cúp FA',
  'EFL Cup': 'Cúp Liên đoàn Anh',
};
export function leagueVi(league: string): string {
  return LEAGUE_VI[league] ?? league;
}

/** ISO UTC → "HH:mm ngày DD/MM" theo giờ VN (UTC+7). */
export function kickoffVi(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(vn.getUTCHours())}:${p(vn.getUTCMinutes())} ngày ${p(vn.getUTCDate())}/${p(vn.getUTCMonth() + 1)}`;
}

/** Diễn đạt lựa chọn theo giọng "nhận định", KHÔNG dùng từ cá cược (tài/xỉu/kèo).
 *  ou → "Over/Under X bàn" (Peter 21/8), 1x2/ah → tên đội / "kết quả HÒA". */
export function pickVi(pick: PickRow): string {
  const line = pick.line;
  switch (pick.market) {
    case 'ou':
      // Peter 21/8: bỏ "nghiêng trận nhiều/ít bàn" khó hiểu — dùng thẳng Over/Under.
      if (pick.market_side === 'over') return line != null ? `Over ${line} bàn` : 'Over';
      if (pick.market_side === 'under') return line != null ? `Under ${line} bàn` : 'Under';
      return 'tổng số bàn của trận';
    case 'ah':
    case '1x2':
      if (pick.market_side === 'home') return pick.home_team;
      if (pick.market_side === 'away') return pick.away_team;
      if (pick.market_side === 'draw') return 'kết quả HÒA';
      return pick.selection;
    case 'btts':
      return 'cả hai đội cùng ghi bàn';
    default:
      return pick.selection;
  }
}

/** SEO slug for outbound TG links (Bug D: prefer slug over UUID). Mirrors web buildPlaySlug. */
function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function buildPickSlug(pick: PickRow): string {
  const date = pick.kickoff_utc.slice(0, 10);
  const homeSl = slugify(pick.home_team);
  const awaySl = slugify(pick.away_team);
  let selSl = slugify(pick.selection);
  if (selSl === homeSl) selSl = 'home';
  else if (selSl === awaySl) selSl = 'away';
  return `${homeSl}-vs-${awaySl}-${selSl}-${date}`;
}

/** "selection line @ odds" pick block (R2), e.g. "Switzerland -0.25 @ 1.70".
 *  Bug C fix: suppress duplicate line when selection already contains it;
 *  don't apply AH sign-formatter to over/under markets. */
export function formatPickBlock(pick: PickRow): string {
  let lineSuffix = '';
  if (pick.line != null) {
    const lineStr = String(pick.line);
    const selectionContainsLine = pick.selection.includes(lineStr);
    if (!selectionContainsLine) {
      // AH sign formatting only for AH markets, not O/U
      const formatted = pick.market === 'ou' ? lineStr : `${pick.line > 0 ? '+' : ''}${pick.line}`;
      lineSuffix = ` ${formatted}`;
    }
  }
  return `${pick.selection}${lineSuffix} @ ${Number(pick.odds_publish).toFixed(2)}`;
}

/** Caption gọn (Nick 21/8): thẻ hình đã mang thông tin → caption chỉ còn nhận định ngắn (nếu có) + link + disclaimer. */
export function formatPickMessage(pick: PickRow, siteUrl: string, extras: PickCardExtras = {}, html = false): string {
  // Thẻ hình đã đủ thông tin (đội · Over/Under · Mức tự tin · giờ VN) → caption KHÔNG lặp lại.
  const esc = (t: string) => (html ? t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : t);
  const link = `${siteUrl}/play/${buildPickSlug(pick)}`;
  return [
    ...(extras.hook ? [`📝 ${esc(extras.hook)}`, ''] : []),
    html ? `🔗 <a href="${link}">Nhận định chi tiết</a>` : `🔗 Nhận định chi tiết: ${link}`,
    cardFooter(pick),
  ].join('\n');
}

/** Voided before kickoff (Nick 12/6): the pick stays visible, never silently deleted. */
export function formatVoidMessage(pick: PickRow, siteUrl: string): string {
  return [
    '\u26D4 H\u1ee6Y NH\u1eacN \u0110\u1ecaNH',
    `${pick.home_team} vs ${pick.away_team} \u00b7 ${leagueVi(pick.league)}`,
    'Hu\u1ef7 tr\u01b0\u1edbc gi\u1edd \u0111\u00e1 \u2014 kh\u00f4ng t\u00ednh v\u00e0o th\u00e0nh t\u00edch.',
    '',
    `\ud83d\udd17 Xem chi ti\u1ebft: ${siteUrl}/play/${pick.id}`,
  ].join('\n');
}

/** Comment on a FB post with the OG data-card as attachment (§3: numbers as proof, hero stays branded). */
export async function postFacebookComment(
  fb: { pageId: string; pageToken: string },
  postId: string,
  message: string,
  attachmentUrl?: string,
): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}),
      access_token: fb.pageToken,
    }),
  });
  const body = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`FB comment failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
  return body.id ?? '';
}

/** POST to the FB Page feed. Returns the FB post id; throws on API error. */
export async function postToFacebook(
  fb: { pageId: string; pageToken: string },
  message: string,
  link: string,
): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${fb.pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, link, access_token: fb.pageToken }),
  });
  const body = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`FB post failed: ${body.error?.message ?? `HTTP ${res.status}`}`);
  }
  return body.id ?? '';
}

export async function announcePick(
  deps: AnnouncePickDeps,
  pick: PickRow,
  extras: PickCardExtras = {},
): Promise<void> {
  // Telegram: in đậm phần chính bằng HTML; Facebook: bản thường (nhấn mạnh sẵn bằng CHỮ HOA).
  await broadcast(
    deps,
    pick,
    formatPickMessage(pick, deps.siteUrl, extras, true),
    formatPickMessage(pick, deps.siteUrl, extras, false),
    'pick announce',
  );
}

/** Announce a pre-kickoff void — same channels, same fail-safe rules as a new pick. */
export async function announceVoid(deps: AnnouncePickDeps, pick: PickRow): Promise<void> {
  const msg = formatVoidMessage(pick, deps.siteUrl);
  await broadcast(deps, pick, msg, msg, 'void announce');
}

async function broadcast(
  deps: AnnouncePickDeps,
  pick: PickRow,
  msgTg: string,
  msgFb: string,
  detail: 'pick announce' | 'void announce',
): Promise<void> {
  // R7: TG NEW PLAY carries the OG data-card (numbers in the image);
  // branded PICK visual is the fallback — never text-only by design.
  // lang=vi: chữ trên thẻ OG render tiếng Việt (Nick 21/8).
  const ogCardUrl = `${deps.siteUrl}/api/og/play/${pick.id}?lang=vi`;
  const brandImageUrl = `${deps.siteUrl}/images/banhbong_pick.png`;

  if (deps.channelChatId) {
    try {
      let sent;
      const tgOpts = { parse_mode: 'HTML' as const };
      try {
        sent = await deps.api.sendPhoto(deps.channelChatId, ogCardUrl, { caption: msgTg, ...tgOpts });
      } catch {
        try {
          sent = await deps.api.sendPhoto(deps.channelChatId, brandImageUrl, { caption: msgTg, ...tgOpts });
        } catch {
          sent = await deps.api.sendMessage(deps.channelChatId, msgTg, tgOpts);
        }
      }
      await deps.store.insertChannelLog({
        pick_id: pick.id,
        channel: 'telegram',
        external_id: String(sent.message_id),
        ok: true,
        detail,
      });
      log.info(`${detail} for ${pick.id} sent to channel ${deps.channelChatId}`);
    } catch (err) {
      log.warn(`channel ${detail} failed for ${pick.id} — pick state already saved:`, err);
    }
  } else {
    log.warn(`CHANNEL_CHAT_ID unset — skipping channel ${detail} for pick ${pick.id}`);
  }

  if (deps.facebook) {
    try {
      let fbId: string;
      try {
        // §3: FB hero = branded PICK visual (stopping power); OG data-card + link go in the first comment.
        const { postPhotoToFacebook } = await import('./announce');
        fbId = await postPhotoToFacebook(deps.facebook, brandImageUrl, `${msgFb}\n\n${deps.siteUrl}/play/${pick.id}`);
        void postFacebookComment(deps.facebook, fbId, `${deps.siteUrl}/play/${pick.id}`, ogCardUrl)
          .catch((err) => log.warn(`FB OG comment failed for ${pick.id} — hero already posted:`, err));
      } catch {
        fbId = await postToFacebook(deps.facebook, msgFb, `${deps.siteUrl}/play/${pick.id}`);
      }
      await deps.store.insertChannelLog({
        pick_id: pick.id,
        channel: 'facebook',
        external_id: fbId,
        ok: true,
        detail,
      });
      log.info(`${detail} for ${pick.id} posted to Facebook (${fbId})`);
      if (detail === 'pick announce') {
        // Pick card lên Story luôn (Peter 22/8 — trước giờ phải đăng tay). Fire-and-forget:
        // Story chết không được kéo theo pick announce.
        const { postFacebookStory } = await import('./announce');
        void postFacebookStory(deps.facebook, ogCardUrl)
          .then((sid) => log.info(`FB Story for ${pick.id} posted (${sid})`))
          .catch((err) => log.warn(`FB Story failed for ${pick.id} — FB post already live:`, err));
      }
    } catch (err) {
      log.warn(`facebook ${detail} failed for ${pick.id} — pick state already saved:`, err);
    }
  }
}
