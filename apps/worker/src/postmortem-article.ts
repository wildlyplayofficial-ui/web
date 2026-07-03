/**
 * Post-mortem newsroom article: when Curator /approve a pick,
 * generate a public post-mortem article (4 languages) + distribute.
 */
import { callClaude, DEFAULT_MODEL, POST_FLAGS, slugify, splitLangSections } from './recap';
import { parseAnalysisSection } from './news';
import { announceArticle, type AnnounceArticleDeps } from './announce-article';
import type { NewPost, PostLang, PickRow, Store } from './store';
import { createRevalidator } from './revalidate';
import { log } from './log';

const MAX_TOKENS = 6000;

function buildPostmortemArticlePrompt(pick: PickRow): string {
  const score = `${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}`;
  const won = pick.status === 'won';
  const lossType = pick.loss_type ? ` Loss type: ${pick.loss_type}.` : '';
  const review = pick.postmortem_approved || pick.postmortem_draft || '';

  return `<role>
You write post-match review articles for the WildlyPlay newsroom.
</role>

<context>
Match: ${score}
League: ${pick.league}
Pick: ${pick.selection} @ ${pick.odds_publish} (${pick.stake_units}u)
Result: ${pick.status?.toUpperCase()} (${won ? '+' : ''}${pick.units_pl}u)${lossType}
Curator review: ${review}
Thesis: ${pick.thesis}
</context>

<rules>
- ATOMIC ANSWER FIRST: The very first sentence of each article body (after META lines) MUST be a self-contained factual statement with score + outcome — e.g. "${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}; ${pick.selection} @ ${pick.odds_publish} ${pick.status === 'won' ? 'landed' : 'missed'} (${Number(pick.units_pl) > 0 ? '+' : ''}${pick.units_pl}u)." This sentence should be liftable by an AI search engine as a standalone answer.
- Write an honest post-mortem: what happened, did the thesis play out, what we learned.
- For losses: explain the loss-type honestly (variance vs bad read).
- For wins: apply honest calibration — acknowledge variance on coinflip/LOW-confidence picks, state confounds, do NOT claim skill on thin margins. WIN reviews must be as critical as LOSS reviews.
- FAITHFULLY reflect the Curator review tone. If the Curator wrote honest/humble text, preserve that tone in ALL 4 languages. Do NOT embellish or add hype.
- BANNED VOCABULARY — applies IDENTICALLY to every language section, including Thai and Spanish. Do not let a local idiom or "softer" translation smuggle back in the banned meaning:
  - Win-hype: edge, value, value bet, +EV, beat the bookie, no luck needed, thesis validated perfectly.
  - Loss-excuse: unlucky, deserved to win, deserved better, hard luck, bad break, wrong call, robbed, harsh result.
- Do NOT invent stats or events not in the data above.
</rules>

<output>
Write exactly FOUR language sections in this order:
English under ${POST_FLAGS.en}, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.

Each section MUST start with these 3 lines:
[META_TITLE] <SEO title under 60 chars>
[META_DESC] <meta description 150-160 chars>
[KEYWORD] <primary keyword>
Then a blank line, then article body (200-400 words, markdown, no H1).
</output>

<self_critique>
Before outputting, check ALL FOUR sections individually (Thai and Spanish are not exempt): (1) no win-hype vocabulary, (2) no loss-excuse vocabulary, (3) honest about result, (4) each section in correct language.
</self_critique>`;
}

export interface PostmortemArticleDeps {
  store: Store;
  env: { apiKey: string | undefined; model?: string };
  revalidateUrl?: string;
  announceArticle?: AnnounceArticleDeps;
}

export async function publishPostmortemArticle(
  deps: PostmortemArticleDeps,
  pick: PickRow,
): Promise<void> {
  try {
    if (!deps.env.apiKey) return;

    const slug = `post-mortem-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.kickoff_utc.slice(0, 10)}`;
    const existing = await deps.store.listPostSlugsByType('post-mortem');
    if (existing.has(slug)) {
      log.info(`postmortem-article: slug "${slug}" exists, skipping`);
      return;
    }

    const text = await callClaude(
      { apiKey: deps.env.apiKey, model: deps.env.model ?? DEFAULT_MODEL },
      buildPostmortemArticlePrompt(pick),
      `postmortem-article ${pick.home_team} vs ${pick.away_team}`,
      MAX_TOKENS,
    );
    if (!text) return;

    const langSections = splitLangSections(text);
    const score = `${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}`;
    const now = new Date().toISOString();
    const posts: NewPost[] = [];

    if (langSections) {
      for (const [lang, rawBody] of Object.entries(langSections) as [PostLang, string][]) {
        const section = parseAnalysisSection(rawBody);
        const title = section?.meta_title ?? `Post-mortem: ${score}`;
        const cleanBody = (section?.body ?? rawBody)
          .replace(/^\[META_TITLE\].*$/gm, '')
          .replace(/^\[META_DESC\].*$/gm, '')
          .replace(/^\[KEYWORD\].*$/gm, '')
          .trim();
        posts.push({
          type: 'post-mortem' as const, slug, lang, title,
          body_md: cleanBody, pick_ids: [pick.id],
          status: 'published', published_at: now,
          meta_title: section?.meta_title ?? title,
          meta_description: section?.meta_description ?? null,
          target_keyword: section?.target_keyword ?? null,
        });
      }
    } else {
      posts.push({
        type: 'post-mortem' as const, slug, lang: 'en',
        title: `Post-mortem: ${score}`, body_md: text.trim(),
        pick_ids: [pick.id], status: 'published', published_at: now,
      });
    }

    for (const post of posts) await deps.store.insertPost(post);
    log.info(`postmortem-article: published ${posts.length} posts for ${score}`);

    const enPost = posts.find((p) => p.lang === 'en');
    if (enPost && deps.announceArticle) void announceArticle(deps.announceArticle, enPost);

    if (deps.revalidateUrl) {
      const rev = createRevalidator({ siteUrl: deps.revalidateUrl, secret: process.env.REVALIDATE_SECRET });
      await rev(['posts']);
    }
  } catch (err) { log.warn(`postmortem-article failed:`, err); }
}
