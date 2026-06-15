/** Post a settled pick's result to the Telegram channel + audit it in channel_log. */
import type { Api } from 'grammy';
import { postToFacebook } from './announce-pick';
import { buildRecapPosts } from './recap';
import type { PickRow, Store } from './store';
import { log } from './log';

export interface AnnounceDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  store: Store;
  /** Result card image (enhancement batch 12/6): when set, the result goes out
   *  as a photo (`{siteUrl}/api/result-card/{id}`) with the text as caption.
   *  Card failures fall back to the plain text message. */
  siteUrl?: string;
  /** FB result post — same fail-safe rule as the pick announce. */
  facebook?: { pageId: string; pageToken: string };
  /** Milestone 4: optional AI recap generator — failures must never break the announcement. */
  recap?: (pick: PickRow) => Promise<string | null>;
  /** Decision #19: optional long-form newsroom article generator; falls back to the channel recap text. */
  recapArticle?: (pick: PickRow) => Promise<string | null>;
}

const BADGES: Record<string, string> = {
  won: '\u2705 WON', lost: '\u274c LOST', push: '\u2796 PUSH', void: '\u26aa VOID',
};

export function formatResultMessage(pick: PickRow): string {
  // Display rule (decision #2): half_win badge = WON, half_loss = LOST; real units shown.
  const half = pick.raw_outcome === 'half_win' || pick.raw_outcome === 'half_loss'
    ? ` (${pick.raw_outcome.replace('_', ' ')})` : '';
  const pl = Number(pick.units_pl);
  const plStr = pl > 0 ? `+${pl}` : `${pl}`;
  return [
    `${BADGES[pick.status] ?? pick.status}${half} \u2014 ${pick.selection} @ ${pick.odds_publish}`,
    `${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}`,
    pick.league,
    `Units: ${plStr} (stake ${Number(pick.stake_units)})`,
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

export function resultCardUrl(siteUrl: string, pick: PickRow): string {
  return `${siteUrl}/api/result-card/${pick.id}`;
}

export async function announceResult(deps: AnnounceDeps, pick: PickRow): Promise<void> {
  if (!deps.channelChatId) {
    log.warn(`CHANNEL_CHAT_ID unset — skipping channel announcement for pick ${pick.id}`);
    return;
  }
  const text = formatResultMessage(pick);
  const cardUrl = deps.siteUrl ? resultCardUrl(deps.siteUrl, pick) : null;

  // Result card photo when possible; plain text is the unconditional fallback.
  let msgId: number;
  let detail = `result ${pick.status} ${pick.units_pl}u`;
  if (cardUrl) {
    try {
      const photoMsg = await deps.api.sendPhoto(deps.channelChatId, cardUrl, { caption: text });
      msgId = photoMsg.message_id;
      detail += ' (card)';
    } catch (err) {
      log.warn(`result card photo failed for pick ${pick.id} — falling back to text:`, err);
      msgId = (await deps.api.sendMessage(deps.channelChatId, text)).message_id;
    }
  } else {
    msgId = (await deps.api.sendMessage(deps.channelChatId, text)).message_id;
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
  if (deps.facebook && deps.siteUrl) {
    try {
      let fbId: string;
      try {
        fbId = await postPhotoToFacebook(deps.facebook, cardUrl!, text);
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

  if (!deps.recap) return;
  try {
    const text = await deps.recap(pick);
    if (text === null) return;
    const recapMsg = await deps.api.sendMessage(deps.channelChatId, text);
    await deps.store.insertChannelLog({
      pick_id: pick.id,
      channel: 'telegram',
      external_id: String(recapMsg.message_id),
      ok: true,
      detail: 'recap',
    });
    log.info(`announced recap for pick ${pick.id} to channel ${deps.channelChatId}`);

    // Publish the newsroom recap article (decision #19, 12/6: auto-publish).
    // Long-form article when the generator delivers; channel recap text otherwise.
    // Must never break the announcement.
    try {
      const articleText = (await deps.recapArticle?.(pick)) ?? text;
      for (const post of buildRecapPosts(pick, articleText)) {
        await deps.store.insertPost(post);
      }
      log.info(`published recap posts for pick ${pick.id}`);
    } catch (err) {
      log.warn(`recap post storage failed for pick ${pick.id} — recap already announced:`, err);
    }
  } catch (err) {
    log.warn(`recap step failed for pick ${pick.id} — result already announced:`, err);
  }
}
