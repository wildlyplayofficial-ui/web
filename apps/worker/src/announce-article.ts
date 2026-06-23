/**
 * Announce any Newsroom article (preview, recap, news, analysis) to
 * TG Channel + Facebook Page with a short EN caption + link back to website.
 * Nick confirmed 17/6: every article type → auto-post EN caption + UTM link.
 * A failed announcement must NEVER break the article pipeline.
 */
import type { Api } from 'grammy';
import { postToFacebook } from './announce-pick';
import type { NewPost, Store } from './store';
import { log } from './log';

export interface AnnounceArticleDeps {
  api: Pick<Api, 'sendMessage'>;
  channelChatId: string | undefined;
  store: Store;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
}

const TYPE_EMOJI: Record<string, string> = {
  preview: '\u{1F4CB}',   // clipboard
  recap: '\u{1F4DD}',     // memo
  news: '\u{1F441}',      // eye (watching)
  analysis: '\u{1F4CA}',  // chart
  'no-play': '\u{26D4}',  // no entry (pass)
};

/** Strip markdown formatting to plain text for social captions. */
function stripMd(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')         // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/[_~`]/g, '')             // misc formatting
    .replace(/\n{2,}/g, '\n')          // collapse blank lines
    .trim();
}

/** Truncate text to maxLen, breaking at the nearest word boundary. */
function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen - 3);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
}

/** Build article link with UTM params. */
export function buildArticleLink(siteUrl: string, slug: string, source: 'facebook' | 'telegram'): string {
  return `${siteUrl}/news/${slug}?utm_source=${source}&utm_medium=social&utm_campaign=newsroom`;
}

/** Build a short EN caption from the article title + body excerpt.
 *  When includeLink=false (FB), the link is omitted from caption text
 *  because postToFacebook passes it as a separate `link` param for the preview card. */
export function buildArticleCaption(
  post: NewPost,
  siteUrl: string,
  source: 'facebook' | 'telegram',
  includeLink = true,
): string {
  const emoji = TYPE_EMOJI[post.type] ?? '\u{1F4F0}';
  const plain = stripMd(post.body_md);
  const excerpt = truncateAtWord(plain, 200);

  const lines = [
    `${emoji} ${post.title}`,
    '',
    excerpt,
  ];

  if (includeLink) {
    lines.push('', `\u{1F449} ${buildArticleLink(siteUrl, post.slug, source)}`);
  }

  return lines.join('\n');
}

/** Post an article to TG Channel + FB Page. Fire-and-forget — never throws. */
export async function announceArticle(
  deps: AnnounceArticleDeps,
  post: NewPost,
): Promise<void> {
  const tag = `article:${post.type}:${post.slug}`;

  if (deps.channelChatId) {
    try {
      const caption = buildArticleCaption(post, deps.siteUrl, 'telegram');
      const sent = await deps.api.sendMessage(deps.channelChatId, caption);
      if (post.pick_ids[0]) {
        try {
          await deps.store.insertChannelLog({
            pick_id: post.pick_ids[0],
            channel: 'telegram',
            external_id: String(sent.message_id),
            ok: true,
            detail: `${post.type} article`,
          });
        } catch (logErr) {
          log.warn(`${tag} TG log failed (message already sent):`, logErr);
        }
      }
      log.info(`${tag} sent to TG channel`);
    } catch (err) {
      log.warn(`${tag} TG channel failed:`, err);
    }
  }

  if (deps.facebook) {
    try {
      const caption = buildArticleCaption(post, deps.siteUrl, 'facebook', false);
      const link = buildArticleLink(deps.siteUrl, post.slug, 'facebook');
      const fbId = await postToFacebook(deps.facebook, caption, link);
      if (post.pick_ids[0]) {
        try {
          await deps.store.insertChannelLog({
            pick_id: post.pick_ids[0],
            channel: 'facebook',
            external_id: fbId,
            ok: true,
            detail: `${post.type} article`,
          });
        } catch (logErr) {
          log.warn(`${tag} FB log failed (post already published):`, logErr);
        }
      }
      log.info(`${tag} posted to Facebook (${fbId})`);
    } catch (err) {
      log.warn(`${tag} Facebook failed:`, err);
    }
  }
}
