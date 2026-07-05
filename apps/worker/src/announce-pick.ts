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
export const CARD_FOOTER = '\u2014 Human-picked \u00b7 Odds at publish \u00b7 Not financial advice';

/** Disclosure footer keyed by author_type (Bug A fix: Scout picks must say AI-picked). */
export function cardFooter(pick: PickRow): string {
  const at = authorTypeOf(pick.author);
  return at === 'fictional_ai'
    ? '\u2014 AI-picked \u00b7 Not a real person \u00b7 Odds at publish \u00b7 Not financial advice'
    : '\u2014 Human-picked \u00b7 Odds at publish \u00b7 Not financial advice';
}

const CONFIDENCE_LABELS: Record<string, string> = { low: 'LOW', medium: 'MED', high: 'HIGH' };

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

/** FINAL 5-line card (Post Restructure Spec v1 §2.1, locked 3/7 — 5 lines is the floor). */
export function formatPickMessage(pick: PickRow, siteUrl: string, extras: PickCardExtras = {}): string {
  const live = pick.publish_score_home != null
    ? ` (live @ ${pick.publish_score_home}-${pick.publish_score_away})` : '';
  const confidence = pick.confidence ? CONFIDENCE_LABELS[pick.confidence] ?? pick.confidence.toUpperCase() : null;
  const against = extras.againstMarket ? ' \u00b7 \u26A0\uFE0F against market' : '';
  const slug = buildPickSlug(pick);
  return [
    `\u{1F3AF} ${pick.home_team} vs ${pick.away_team} \u00b7 ${pick.league} \u00b7 KO ${pick.kickoff_utc.slice(11, 16)} UTC${live}`,
    `\u{1F449} ${formatPickBlock(pick)} \u00b7 ${Number(pick.stake_units)}u${confidence ? ` \u00b7 ${confidence}` : ''}${against}`,
    ...(extras.hook ? [`\u{1F4DD} ${extras.hook}`] : []),
    `\u{1F517} ${siteUrl}/play/${slug}`,
    cardFooter(pick),
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
  await broadcast(deps, pick, formatPickMessage(pick, deps.siteUrl, extras), 'pick announce');
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
  // R7: TG NEW PLAY carries the OG data-card (numbers in the image);
  // branded PICK visual is the fallback — never text-only by design.
  const ogCardUrl = `${deps.siteUrl}/api/og/play/${pick.id}`;
  const brandImageUrl = `${deps.siteUrl}/images/wildlyplay_pick.png`;

  if (deps.channelChatId) {
    try {
      let sent;
      try {
        sent = await deps.api.sendPhoto(deps.channelChatId, ogCardUrl, { caption: msg });
      } catch {
        try {
          sent = await deps.api.sendPhoto(deps.channelChatId, brandImageUrl, { caption: msg });
        } catch {
          sent = await deps.api.sendMessage(deps.channelChatId, msg);
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
        fbId = await postPhotoToFacebook(deps.facebook, brandImageUrl, `${msg}\n\n${deps.siteUrl}/play/${pick.id}`);
        void postFacebookComment(deps.facebook, fbId, `${deps.siteUrl}/play/${pick.id}`, ogCardUrl)
          .catch((err) => log.warn(`FB OG comment failed for ${pick.id} — hero already posted:`, err));
      } catch {
        fbId = await postToFacebook(deps.facebook, msg, `${deps.siteUrl}/play/${pick.id}`);
      }
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
