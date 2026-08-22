/**
 * Shared TG Channel + Facebook Page deps for pick-lifecycle announcements
 * (announcePick / announceResult / announceVoid).
 * Nick 21/8: only /pick and /void reach TG + FB — newsroom articles are web-only,
 * so the article announcer that used to live here is gone.
 */
import type { Api } from 'grammy';
import type { Store } from './store';

export interface AnnounceArticleDeps {
  api: Pick<Api, 'sendMessage' | 'sendPhoto'>;
  channelChatId: string | undefined;
  store: Store;
  siteUrl: string;
  facebook?: { pageId: string; pageToken: string };
}
