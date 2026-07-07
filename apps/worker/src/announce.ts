/** Post a settled pick's result to the Telegram channel + audit it in channel_log. */
import type { Api } from 'grammy';
import { postToFacebook, formatPickBlock, CARD_FOOTER } from './announce-pick';
import { buildRecapPosts, detectClosingLineFabrication } from './recap';
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

const BADGES: Record<string, string> = {
  won: '\u2705 WIN', lost: '\u274c LOSS', push: '\u{1F7E1} PUSH', void: '\u26aa VOID',
};

/** §2.3: all 5 AH settlement states get distinct markers (quarter-lines are routine). */
const OUTCOME_BADGES: Record<string, string> = {
  win: '\u2705 WIN',
  half_win: '\u2705\u00bd HALF-WIN',
  push: '\u{1F7E1} PUSH',
  half_loss: '\u274c\u00bd HALF-LOSS',
  loss: '\u274c LOSS',
};

/** Branded settled banner per status (§2.6 image table, fallback when OG card fails). */
const SETTLED_IMAGES: Record<string, string> = {
  won: 'wildlyplay_settled_win.png',
  lost: 'wildlyplay_settled_loss.png',
  push: 'wildlyplay_settled_push.png',
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

/** 3-line SETTLED card (Post Restructure Spec v1 §2.3, locked 3/7 — 5 AH states). */
export function formatResultMessage(pick: PickRow, record?: RecordSummary): string {
  const badge = (pick.raw_outcome && OUTCOME_BADGES[pick.raw_outcome])
    ?? BADGES[pick.status] ?? pick.status;
  const lines = [
    `${badge} | ${formatPickBlock(pick)} \u2192 FT ${pick.home_score}-${pick.away_score} \u00b7 ${formatUnits(Number(pick.units_pl))}`,
  ];
  if (record) {
    lines.push(`\u{1F4CA} Record: ${record.wins}-${record.losses}-${record.pushes} \u00b7 ${formatUnits(record.units)}`);
  }
  lines.push(CARD_FOOTER);
  return lines.join('\n');
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

/** R7: SETTLED carries the OG data-card in settled state (WIN/LOSS/PUSH badge + updated record). */
export function resultCardUrl(siteUrl: string, pick: PickRow): string {
  return `${siteUrl}/api/og/play/${pick.id}`;
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

  // 📊 record line — failures must not block the result card.
  let record: RecordSummary | undefined;
  try {
    record = summarizeRecord(await deps.store.listByStatus(['won', 'lost', 'push'], pick.author));
  } catch (err) {
    log.warn(`record summary failed for pick ${pick.id} — sending card without record line:`, err);
  }

  const text = formatResultMessage(pick, record);
  const cardUrl = deps.siteUrl ? resultCardUrl(deps.siteUrl, pick) : null;
  const brandUrl = deps.siteUrl && SETTLED_IMAGES[pick.status]
    ? `${deps.siteUrl}/images/${SETTLED_IMAGES[pick.status]}` : null;

  // OG settled card → branded W/L/P banner → plain text (unconditional fallback).
  let msgId: number;
  let detail = `result ${pick.status} ${pick.units_pl}u`;
  try {
    if (!cardUrl) throw new Error('no siteUrl');
    const photoMsg = await deps.api.sendPhoto(deps.channelChatId, cardUrl, { caption: text });
    msgId = photoMsg.message_id;
    detail += ' (card)';
  } catch (err) {
    if (cardUrl) log.warn(`result card photo failed for pick ${pick.id} — trying branded banner:`, err);
    try {
      if (!brandUrl) throw new Error('no brand image');
      const photoMsg = await deps.api.sendPhoto(deps.channelChatId, brandUrl, { caption: text });
      msgId = photoMsg.message_id;
      detail += ' (banner)';
    } catch {
      msgId = (await deps.api.sendMessage(deps.channelChatId, text)).message_id;
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
      const enPost = recapPosts.find((p) => p.lang === 'en');
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
