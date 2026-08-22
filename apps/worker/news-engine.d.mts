/** Type surface of news-engine.mjs for the TS worker — runtime stays the .mjs itself.
 *  Keep in sync with the runNewsTick signature in news-engine.mjs. */

export interface NewsTickArticle {
  slug: string;
  title: string;
  body?: string;
  url?: string;
}

export function runNewsTick(opts?: {
  mode?: 'morning' | 'evening';
  dryRun?: boolean;
  limit?: number;
  now?: string;
}): Promise<NewsTickArticle[]>;
