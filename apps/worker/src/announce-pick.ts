/**
 * Announce a freshly published pick to the TG channel + Facebook Page
 * (3-point plan Nick OK'd 12/6 — replaces the n8n v14 posting flow).
 * A failed announcement must NEVER break the pick publication.
 */
import type { Api } from 'grammy';
import type { PickRow, Store } from './store';
import { log } from './log';

export interface AnnouncePickDeps {
  api: Pick<Api, 'sendMessage'>;
  channelChatId: string | undefined;
  store: Store;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
}

export function formatPickMessage(pick: PickRow, siteUrl: string): string {
  const line = pick.line != null ? ` (line ${pick.line})` : '';
  const live = pick.publish_score_home != null
    ? ` (live @ ${pick.publish_score_home}-${pick.publish_score_away})` : '';
  return [
    '\u{1F195} NEW PLAY \u2014 The Curator',
    `${pick.home_team} vs ${pick.away_team} \u00b7 ${pick.league}`,
    `Kickoff: ${pick.kickoff_utc.slice(0, 16).replace('T', ' ')} UTC`,
    `Play: ${pick.selection} @ ${pick.odds_publish}${line}${live} | stake ${Number(pick.stake_units)}u`,
    `\u{1F4AD} ${pick.thesis}`,
    '',
    `\u{1F449} ${siteUrl}/play/${pick.id}`,
    'Human-picked. Odds at publish. Not financial advice.',
  ].join('\n');
}

/** Voided before kickoff (Nick 12/6): the pick stays visible, never silently deleted. */
export function formatVoidMessage(pick: PickRow, siteUrl: string): string {
  return [
    '\u26D4 PLAY VOIDED \u2014 The Curator',
    `${pick.home_team} vs ${pick.away_team} \u00b7 ${pick.league}`,
    `Play: ${pick.selection} @ ${pick.odds_publish} \u2014 voided before kickoff.`,
    'Does not count toward the record.',
    '',
    `\u{1F449} ${siteUrl}/play/${pick.id}`,
  ].join('\n');
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

export async function announcePick(deps: AnnouncePickDeps, pick: PickRow): Promise<void> {
  await broadcast(deps, pick, formatPickMessage(pick, deps.siteUrl), 'pick announce');
}

/** Announce a pre-kickoff void — same channels, same fail-safe rules as a new pick. */
export async function announceVoid(deps: AnnouncePickDeps, pick: PickRow): Promise<void> {
  await broadcast(deps, pick, formatVoidMessage(pick, deps.siteUrl), 'void announce');
}

async function broadcast(
  deps: AnnouncePickDeps,
  pick: PickRow,
  msg: string,
  detail: 'pick announce' | 'void announce',
): Promise<void> {
  if (deps.channelChatId) {
    try {
      const sent = await deps.api.sendMessage(deps.channelChatId, msg);
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
      const fbId = await postToFacebook(deps.facebook, msg, `${deps.siteUrl}/play/${pick.id}`);
      await deps.store.insertChannelLog({
        pick_id: pick.id,
        channel: 'facebook',
        external_id: fbId,
        ok: true,
        detail,
      });
      log.info(`${detail} for ${pick.id} posted to Facebook (${fbId})`);
    } catch (err) {
      log.warn(`facebook ${detail} failed for ${pick.id} — pick state already saved:`, err);
    }
  }
}
