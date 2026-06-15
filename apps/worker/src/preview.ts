/**
 * Pick-driven newsroom preview (decision #19, 12/6): when the Curator publishes
 * a pick, AI writes a bilingual pre-match article and it auto-publishes to /news.
 * A preview failure must NEVER break the pick publication — every path logs and returns.
 */
import { callClaude, POST_FLAGS, slugify, splitLangSections } from './recap';
import type { NewPost, PickRow, PostLang, Store } from './store';
import { log } from './log';

export function buildPreviewPrompt(pick: PickRow): string {
  return [
    'You write pre-match articles for the WildlyPlay newsroom (wildlyplay.com/news), a football picks site.',
    '',
    'The Curator (human) just published this pick:',
    `- Match: ${pick.home_team} vs ${pick.away_team}`,
    `- League: ${pick.league}`,
    `- Kickoff (UTC): ${pick.kickoff_utc}`,
    `- Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)${pick.publish_score_home != null ? ` — placed in-play (live @ ${pick.publish_score_home}-${pick.publish_score_away})` : ''}`,
    `- Curator's thesis: ${pick.thesis}`,
    '',
    `Write a pre-match article with exactly FOUR sections, in this order: English under a ${POST_FLAGS.en} header, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}. Each section: 150-250 words, markdown allowed (short paragraphs, no H1).`,
    'Rules:',
    "- Work ONLY from the data above. The Curator's thesis is the spine of the article — expand his reasoning, explain what the line and odds mean for readers.",
    '- Do NOT invent injuries, lineups, stats, quotes or news — you have no live sources.',
    '- Responsible language: NEVER use "sure win", "guaranteed", "can\'t lose" or any promise of profit. Frame as analysis, not advice.',
    '- End each section with this disclosure: "Human-picked, AI-written."',
  ].join('\n');
}

const PREVIEW_TITLES: Record<PostLang, string> = {
  en: 'Preview', vi: 'Trước trận', th: 'พรีวิว', es: 'Previa',
};

/** Published posts rows for a preview. One row per language section when the
 *  split works (en/vi/th/es); one 'en' row with the whole text otherwise. Pure. */
export function buildPreviewPosts(pick: PickRow, text: string): NewPost[] {
  const matchup = `${pick.home_team} vs ${pick.away_team}`;
  const base = {
    type: 'preview' as const,
    slug: `preview-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}`,
    pick_ids: [pick.id],
    status: 'published' as const,
    published_at: new Date().toISOString(),
  };
  const sections = splitLangSections(text);
  if (!sections) {
    return [{ ...base, lang: 'en', title: `${PREVIEW_TITLES.en}: ${matchup}`, body_md: text.trim() }];
  }
  return (Object.entries(sections) as [PostLang, string][]).map(([lang, body]) => ({
    ...base, lang, title: `${PREVIEW_TITLES[lang]}: ${matchup}`, body_md: body,
  }));
}

/** Generate + publish the preview article for a fresh pick. Never throws. */
export async function publishPreview(
  deps: { store: Store; env: { apiKey: string | undefined; model?: string } },
  pick: PickRow,
): Promise<void> {
  try {
    const text = await callClaude(deps.env, buildPreviewPrompt(pick), `preview pick ${pick.id}`, 3500);
    if (text === null) return;
    for (const post of buildPreviewPosts(pick, text)) {
      await deps.store.insertPost(post);
    }
    log.info(`published preview posts for pick ${pick.id}`);
  } catch (err) {
    log.warn(`preview publication failed for pick ${pick.id} — pick already published:`, err);
  }
}
