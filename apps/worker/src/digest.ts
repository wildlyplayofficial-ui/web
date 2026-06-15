/**
 * Weekly digest (batch 4, 12/6): every Sunday 13:00 UTC (20:00 ICT) post the
 * week's record — W-L-P, units, best play, avg CLV — to the TG channel + FB Page.
 * Pure builders + a deterministic due-check; the interval loop only glues them.
 */
import type { Api } from 'grammy';
import { postToFacebook } from './announce-pick';
import type { PickRow, Store } from './store';
import { log } from './log';

export const DIGEST_CHECK_MS = 60 * 60_000; // hourly check
const DIGEST_UTC_DAY = 0;   // Sunday
const DIGEST_UTC_HOUR = 13; // 13:00 UTC = 20:00 ICT

export interface DigestDeps {
  api: Pick<Api, 'sendMessage'>;
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

function fmtUnits(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/** Digest text for the week ending at `now`. Null when nothing settled (no spam weeks). */
export function buildWeeklyDigest(picks: PickRow[], siteUrl: string, now: Date): string | null {
  const week = weeklyPicks(picks, now);
  if (week.length === 0) return null;
  const won = week.filter((p) => p.status === 'won').length;
  const lost = week.filter((p) => p.status === 'lost').length;
  const push = week.filter((p) => p.status === 'push').length;
  const units = week.reduce((sum, p) => sum + Number(p.units_pl ?? 0), 0);
  const best = week.reduce((a, b) => (Number(b.units_pl ?? 0) > Number(a.units_pl ?? 0) ? b : a));
  const clvs = week
    .filter((p) => p.odds_close != null)
    .map((p) => (Number(p.odds_publish) / Number(p.odds_close) - 1) * 100);
  const lines = [
    `\u{1F4CA} WildlyPlay weekly digest`,
    `Record this week: ${won}-${lost}-${push} (W-L-P), ${fmtUnits(units)} units`,
    `Best play: ${best.selection} @ ${best.odds_publish} (${fmtUnits(Number(best.units_pl ?? 0))}u) \u2014 ` +
      `${best.home_team} ${best.home_score}-${best.away_score} ${best.away_team}`,
  ];
  if (clvs.length > 0) {
    const avg = Math.round((clvs.reduce((s, c) => s + c, 0) / clvs.length) * 10) / 10;
    lines.push(`Avg CLV: ${avg > 0 ? '+' : ''}${avg}%`);
  }
  lines.push(`Full track record: ${siteUrl}/stats`);
  return lines.join('\n');
}

/** Returns the dedupe key (UTC date) when a digest should fire now, else null. */
export function digestDue(now: Date, lastKey: string | null): string | null {
  if (now.getUTCDay() !== DIGEST_UTC_DAY || now.getUTCHours() !== DIGEST_UTC_HOUR) return null;
  const key = now.toISOString().slice(0, 10);
  return key === lastKey ? null : key;
}

/** One scheduler tick: send the digest if due. Returns the new dedupe key, or `lastKey`. */
export async function digestOnce(
  deps: DigestDeps,
  lastKey: string | null,
  now: Date = new Date(),
): Promise<string | null> {
  const key = digestDue(now, lastKey);
  if (!key) return lastKey;
  if (!deps.channelChatId) {
    log.warn('digest: CHANNEL_CHAT_ID unset — skipping weekly digest');
    return key;
  }
  const settled = await deps.store.listByStatus(['won', 'lost', 'push']);
  const text = buildWeeklyDigest(settled, deps.siteUrl, now);
  if (text === null) {
    log.info('digest: nothing settled this week — skipping');
    return key;
  }
  await deps.api.sendMessage(deps.channelChatId, text);
  log.info(`digest: weekly digest sent to channel ${deps.channelChatId}`);
  // FB post is fail-safe: the channel digest already went out.
  if (deps.facebook) {
    try {
      const fbId = await postToFacebook(deps.facebook, text, `${deps.siteUrl}/stats`);
      log.info(`digest: weekly digest posted to Facebook (${fbId})`);
    } catch (err) {
      log.warn('digest: facebook post failed — channel already posted:', err);
    }
  }
  return key;
}

/** Starts the hourly check loop; returns a stop function. */
export function startWeeklyDigest(deps: DigestDeps): () => void {
  log.info('weekly digest scheduler started (Sundays 13:00 UTC)');
  let lastKey: string | null = null;
  const tick = () =>
    void digestOnce(deps, lastKey)
      .then((key) => { lastKey = key; })
      .catch((err) => log.error('digest tick failed:', err));
  tick();
  const timer = setInterval(tick, DIGEST_CHECK_MS);
  return () => {
    clearInterval(timer);
    log.info('weekly digest scheduler stopped');
  };
}
