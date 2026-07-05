/**
 * Pick-driven newsroom preview (decision #19, 12/6): when the Curator publishes
 * a pick, AI writes a bilingual pre-match article and it auto-publishes to /news.
 * A preview failure must NEVER break the pick publication — every path logs and returns.
 */
import { callClaude, disclosureBlock, POST_FLAGS, slugify, splitLangSections } from './recap';
import type { NewPost, PickRow, PostLang, Store } from './store';
import { authorTypeOf } from './store';
import { log } from './log';

export function buildPreviewPrompt(pick: PickRow): string {
  const inPlayNote = pick.publish_score_home != null
    ? ` — placed in-play (live @ ${pick.publish_score_home}-${pick.publish_score_away})`
    : '';
  const persona = pick.author === 'scout' ? 'the Scout' : 'the Curator';

  return `<role>
You are a senior football analyst writing pre-match articles for the WildlyPlay newsroom (wildlyplay.com/news). You expand ${persona}'s thesis into compelling, readable analysis — never generic previews.
</role>

<context>
Match: ${pick.home_team} vs ${pick.away_team}
League: ${pick.league}
Kickoff (UTC): ${pick.kickoff_utc}
Pick author: ${persona}
Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)${inPlayNote}
${persona}'s thesis: ${pick.thesis}
</context>

<rules>
- ${persona}'s thesis is the spine of the article — expand the reasoning, explain what the line and odds mean for readers.
- Work ONLY from the data above. Do NOT invent injuries, lineups, stats, quotes, or news — you have no live sources.
- Do NOT guess the tournament round/stage (e.g. "Round of 32", "Round of 16", "Quarter-final"). If the League field above does not specify the round, omit it — a wrong round is worse than none.
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose" or any promise of profit. Frame as analysis, not advice.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie". Use "the line looks generous" or "the price implies" instead.
- ATOMIC ANSWER FIRST: The very first sentence of each section MUST be a self-contained factual statement with the pick and odds — e.g. "${persona === 'the Scout' ? 'The Scout' : 'The Curator'} picks ${pick.selection} @ ${pick.odds_publish} for ${pick.home_team} vs ${pick.away_team}." This sentence should be liftable by an AI as a standalone answer.
- Then expand with a specific tactical or analytical angle — never a template opener.
- End each section with this disclosure as plain text (no bold, no italic, no markdown formatting), matching that section's own language exactly:
${disclosureBlock(authorTypeOf(pick.author))}
</rules>

<bad_examples>
BAD: "Sweden face Netherlands in World Cup Group E. Full preview covering form, key players, tactics and our pick for this clash."
WHY: Template opener ("X face Y in Group Z"), generic preview summary that could apply to any match, no thesis-driven insight.
</bad_examples>

<good_examples>
GOOD: "Sweden gambled on a high line against Netherlands — the tactical mismatch that defined everything. The Curator sees the same vulnerability here, and the market hasn't adjusted."
WHY: Leads with a specific tactical angle tied to the thesis, immediately tells the reader why this matters.
</good_examples>

<output>
Write exactly FOUR sections in this order: English under a ${POST_FLAGS.en} header, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.
Each section: 150-250 words, markdown allowed (short paragraphs, no H1).
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) each language section is in the correct language, (4) no template opener like "X face Y in Group Z", (5) disclosure present in every section.
</self_critique>`;
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
    author: pick.author,
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
    const posts = buildPreviewPosts(pick, text);
    for (const post of posts) {
      await deps.store.insertPost(post);
    }
    // Post Restructure v1 (R6): preview articles are web/SEO-only — no TG/FB notification
    // (the 🎯 PICK card is the one canonical announcement per pick).
    log.info(`published preview posts for pick ${pick.id}`);
  } catch (err) {
    log.warn(`preview publication failed for pick ${pick.id} — pick already published:`, err);
  }
}
