/**
 * IndexNow ping — notify Bing/Yandex of freshly published URLs.
 * Fire-and-forget after article publish/settle. Never blocks pipeline.
 */
import { log } from './log';

export function createIndexNowPinger(env: {
  siteUrl: string;
  secret: string | undefined;
}): (urls: string[]) => Promise<void> {
  if (!env.secret) return async () => {};

  const endpoint = `${env.siteUrl}/api/indexnow`;
  const secret = env.secret;

  return async (urls: string[]): Promise<void> => {
    if (urls.length === 0) return;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ urls }),
      });
      if (res.ok) {
        log.info(`indexnow: pinged ${urls.length} URL(s)`);
      } else {
        log.warn(`indexnow: HTTP ${res.status}`);
      }
    } catch {
      // Fire-and-forget — never block
    }
  };
}
