/**
 * On-demand web cache busting (Nick 13/6). Fire-and-forget POST to the site's
 * /api/revalidate after pick lifecycle events (/pick, settle, /void) so the
 * Board/Archive update in seconds instead of the 5-minute ISR window.
 * Disabled when REVALIDATE_SECRET is unset — never blocks the pipeline.
 */
import { log } from './log';

export interface RevalidateEnv {
  siteUrl: string;
  secret: string | undefined;
}

export function createRevalidator(env: RevalidateEnv): (tags: string[]) => Promise<void> {
  if (!env.secret) {
    log.warn('REVALIDATE_SECRET unset — on-demand web revalidation disabled');
    return async () => {};
  }
  const url = `${env.siteUrl}/api/revalidate`;
  const secret = env.secret;
  return async (tags: string[]): Promise<void> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) log.warn(`revalidate ${tags.join(',')} failed: HTTP ${res.status}`);
      else log.info(`revalidated web cache: ${tags.join(',')}`);
    } catch (err) {
      log.warn('revalidate request failed:', err);
    }
  };
}
