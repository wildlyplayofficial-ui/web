/**
 * 📊 WEEKLY LEDGER (Post Restructure Spec v1 §2.5, Nick DUYỆT 3/7): every Sunday
 * 13:00 UTC (20:00 ICT) post the ledger card — all-time record, weekly picks/passes,
 * calibration by confidence — to the TG channel + FB Page (recap banner hero).
 * Pure builders + a deterministic due-check; the interval loop only glues them.
 */
import type { Api } from 'grammy';
import { postToFacebook, CARD_FOOTER } from './announce-pick';
import { postPhotoToFacebook } from './announce';
import type { PickRow, Store } from './store';
import { log } from './log';

export const DIGEST_CHECK_MS = 60 * 60_000; // hourly check
const DIGEST_UTC_DAY = 0;   // Sunday
const DIGEST_UTC_HOUR = 13; // 13:00 UTC = 20:00 ICT

export interface DigestDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  store: Store;
  channelChatId: string | undefined;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
}

/** Picks settled within the 7 days before `now`. */
export function weeklyPicks(picks: PickRow[], now: Date): PickRow[] {
  const start = now.getTime() - 7 * 86_400_000;
  return picks.filter((p) => {
    if (p.settled_at == null) return false;
    const t = new Date(p.settled_at).getTime();
    return t >= start && t <= now.getTime();
  });
}

/** No-play passes in the 7 days before `now`, from slug dates (`no-play-…-YYYY-MM-DD`). */
export function weeklyPassCount(noPlaySlugs: Set<string>, now: Date): number {
  const start = now.getTime() - 7 * 86_400_000;
  let count = 0;
  for (const slug of noPlaySlugs) {
    const m = slug.match(/(\d{4}-\d{2}-\d{2})$/);
    if (!m) continue;
    const t = new Date(`${m[1]}T00:00:00Z`).getTime();
    if (t >= start && t <= now.getTime()) count++;
  }
  return count;
}

/** Week number since the first settled pick (week 1 = launch week). */
export function ledgerWeekNumber(settled: PickRow[], now: Date): number {
  const first = settled.reduce((min, p) => {
    const t = p.settled_at ? new Date(p.settled_at).getTime() : Infinity;
    return Math.min(min, t);
  }, Infinity);
  if (!Number.isFinite(first)) return 1;
  return Math.max(1, Math.floor((now.getTime() - first) / (7 * 86_400_000)) + 1);
}

/** `LOW 4-2, MED 6-2, HIGH 4-0` — all-time W-L per pre-registered confidence (Trust-Anchor pillar 2). */
export function buildCalibrationLine(settled: PickRow[]): string | null {
  const parts: string[] = [];
  for (const [level, label] of [['low', 'THẤP'], ['medium', 'TRUNG BÌNH'], ['high', 'CAO']] as const) {
    const of = settled.filter((p) => p.confidence === level);
    if (of.length === 0) continue;
    const w = of.filter((p) => p.status === 'won').length;
    const l = of.filter((p) => p.status === 'lost').length;
    parts.push(`${label} ${w}-${l}`);
  }
  return parts.length > 0 ? `Độ chuẩn theo mức tin: ${parts.join(', ')}` : null;
}

/** 4-line WEEKLY LEDGER card. Null when nothing happened this week (no spam weeks). */
export function buildWeeklyDigest(
  settled: PickRow[],
  passes: number,
  siteUrl: string,
  now: Date,
  html = false,
): string | null {
  const week = weeklyPicks(settled, now);
  if (week.length === 0 && passes === 0) return null;
  const w = week.filter((p) => p.status === 'won').length;
  const l = week.filter((p) => p.status === 'lost').length;
  const p = week.filter((p2) => p2.status === 'push').length;
  const allW = settled.filter((x) => x.status === 'won').length;
  const allL = settled.filter((x) => x.status === 'lost').length;
  const allP = settled.filter((x) => x.status === 'push').length;
  // Nội dung toàn số + nhãn cố định, không có tên đội → không cần escape HTML.
  const b = (t: string) => (html ? `<b>${t}</b>` : t);
  const lines = [
    `\u{1F4CA} ${b(`Tuần ${ledgerWeekNumber(settled, now)}`)} \u2014 Thành tích: ${b(`${allW} đúng \u00b7 ${allL} chưa trúng \u00b7 ${allP} hòa`)}`,
    `Tuần này: ${week.length} nhận định (${w} đúng, ${l} chưa trúng, ${p} hòa) \u00b7 Bỏ qua: ${passes} trận`,
  ];
  const calibration = buildCalibrationLine(settled);
  if (calibration) lines.push(calibration);
  lines.push(
    html ? `\u{1F517} <a href="${siteUrl}/stats">Xem thống kê</a>` : `\u{1F517} Xem thống kê: ${siteUrl}/stats`,
    CARD_FOOTER,
  );
  return lines.join('\n');
}

/** Returns the dedupe key (UTC date) when a digest should fire now, else null. */
export function digestDue(now: Date, lastKey: string | null): string | null {
  if (now.getUTCDay() !== DIGEST_UTC_DAY || now.getUTCHours() !== DIGEST_UTC_HOUR) return null;
  const key = now.toISOString().slice(0, 10);
  return key === lastKey ? null : key;
}

/** One scheduler tick: send the ledger if due. Returns the new dedupe key, or `lastKey`. */
export async function digestOnce(
  deps: DigestDeps,
  lastKey: string | null,
  now: Date = new Date(),
): Promise<string | null> {
  const key = digestDue(now, lastKey);
  if (!key) return lastKey;
  if (!deps.channelChatId) {
    log.warn('digest: CHANNEL_CHAT_ID unset — skipping weekly ledger');
    return key;
  }
  const settled = await deps.store.listByStatus(['won', 'lost', 'push'], 'curator');
  const noPlaySlugs = await deps.store.listPostSlugsByType('no-play');
  const passes = weeklyPassCount(noPlaySlugs, now);
  const textTg = buildWeeklyDigest(settled, passes, deps.siteUrl, now, true);
  const textFb = buildWeeklyDigest(settled, passes, deps.siteUrl, now, false);
  if (textFb === null) {
    log.info('digest: no picks or passes this week — skipping');
    return key;
  }
  // R7: never text-only — recap banner with the card as caption, text as fallback.
  const imageUrl = `${deps.siteUrl}/images/banhbong_recap.png`;
  const tgOpts = { parse_mode: 'HTML' as const };
  try {
    await deps.api.sendPhoto(deps.channelChatId, imageUrl, { caption: textTg!, ...tgOpts });
  } catch (err) {
    log.warn('digest: recap banner failed — falling back to text:', err);
    await deps.api.sendMessage(deps.channelChatId, textTg!, tgOpts);
  }
  log.info(`digest: weekly ledger sent to channel ${deps.channelChatId}`);
  // FB post is fail-safe: the channel ledger already went out.
  if (deps.facebook) {
    try {
      let fbId: string;
      try {
        fbId = await postPhotoToFacebook(deps.facebook, imageUrl, textFb!);
      } catch {
        fbId = await postToFacebook(deps.facebook, textFb!, `${deps.siteUrl}/stats`);
      }
      log.info(`digest: weekly ledger posted to Facebook (${fbId})`);
    } catch (err) {
      log.warn('digest: facebook post failed — channel already posted:', err);
    }
  }
  return key;
}

/** Starts the hourly check loop; returns a stop function. */
export function startWeeklyDigest(deps: DigestDeps): () => void {
  log.info('weekly ledger scheduler started (Sundays 13:00 UTC)');
  let lastKey: string | null = null;
  const tick = () =>
    void digestOnce(deps, lastKey)
      .then((key) => { lastKey = key; })
      .catch((err) => log.error('digest tick failed:', err));
  tick();
  const timer = setInterval(tick, DIGEST_CHECK_MS);
  return () => {
    clearInterval(timer);
    log.info('weekly ledger scheduler stopped');
  };
}
