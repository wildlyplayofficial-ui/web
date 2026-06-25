/**
 * Milestone 4: AI-written post-match recap via the Anthropic Messages API (plain fetch, no SDK).
 * A recap failure must NEVER break the result announcement — every path returns null instead of throwing.
 */
import type { NewPost, PickRow, PostLang } from './store';

/** Team name → URL-safe slug: "Türkiye" → "turkiye", "Bosnia and Herzegovina" → "bosnia-and-herzegovina". */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
import { log } from './log';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
// 4-language articles (~3500 tokens) need well over 20s — the 12/6 Canada preview
// died on a 20s timeout. Generation is fire-and-forget, so a long timeout is safe.
const TIMEOUT_MS = 120_000;
const EN_FLAG = '\u{1F1EC}\u{1F1E7}';
const VI_FLAG = '\u{1F1FB}\u{1F1F3}';

/** Newsroom languages (TH + ES added 12/6 per Nick). Order = section order in prompts. */
export const POST_FLAGS: Record<PostLang, string> = {
  en: EN_FLAG,
  vi: VI_FLAG,
  th: '\u{1F1F9}\u{1F1ED}',
  es: '\u{1F1EA}\u{1F1F8}',
};

export interface SettledRecord {
  won: number;
  lost: number;
  push: number;
  units: number;
}

/** W-L-P record over settled picks. Void picks are excluded from the counts but their units still sum. */
export function computeRecord(picks: PickRow[]): SettledRecord {
  const record = { won: 0, lost: 0, push: 0, units: 0 };
  for (const pick of picks) {
    if (pick.status === 'won') record.won += 1;
    else if (pick.status === 'lost') record.lost += 1;
    else if (pick.status === 'push') record.push += 1;
    record.units += Number(pick.units_pl ?? 0);
  }
  record.units = Math.round(record.units * 100) / 100; // avoid float noise
  return record;
}

export function buildRecapPrompt(pick: PickRow, record: SettledRecord): string {
  const units = record.units > 0 ? `+${record.units}` : `${record.units}`;
  const pl = Number(pick.units_pl);

  // 4 languages on the channel too (Nick 13/6) — same flag order as the newsroom articles.
  return `<role>
You write post-match recaps for WildlyPlay's public Telegram channel. Short, honest, thesis-driven — every recap evaluates whether the pre-match read was right.
</role>

<context>
League: ${pick.league}
Final score: ${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}
Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)
Outcome: ${pick.raw_outcome} (${pl > 0 ? `+${pl}` : pl} units)
Curator's pre-match thesis: ${pick.thesis}
Updated channel record: ${record.won}-${record.lost}-${record.push} (W-L-P), ${units} units total
</context>

<rules>
- Honest transparency: state plainly whether the thesis played out or not — recap misses as openly as hits.
- Work ONLY from the data above — do not invent match events, xG, or stats you cannot know.
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose" or any promise of profit.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie".
- No emoji spam.
- End each section with the updated record line.
- Output plain text only — no markdown headers other than the four flag headers.
- ATOMIC ANSWER FIRST: The very first sentence of each section MUST be a self-contained factual statement with the score and outcome — e.g. "${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}; ${pick.selection} @ ${pick.odds_publish} ${pick.status === 'won' ? 'landed' : 'missed'} (${pl > 0 ? '+' : ''}${pl}u)." This sentence should be liftable by an AI as a standalone answer.
- Then evaluate the thesis — never a generic scoreline summary.
</rules>

<bad_examples>
BAD: "Team A beat Team B 3-1 in a dominant performance. Great result for the channel."
WHY: Generic scoreline recap, no thesis evaluation, "great result" is hype not analysis.
</bad_examples>

<good_examples>
GOOD: "Five goals in 90 minutes proved the Over thesis right — but the margin was closer than the scoreline suggests. The 3-2 came from a 92nd-minute set piece."
WHY: Evaluates thesis directly, adds nuance about how the result unfolded, honest about the margin.
</good_examples>

<output>
Write exactly FOUR sections in this order: English under a ${POST_FLAGS.en} header, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.
Each section: 60 words or fewer.
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) each language section is in the correct language, (4) thesis explicitly evaluated, (5) record line present in every section.
</self_critique>`;
}

/** Split AI output on the flag headers (any subset/order of \u{1F1EC}\u{1F1E7}/\u{1F1FB}\u{1F1F3}/\u{1F1F9}\u{1F1ED}/\u{1F1EA}\u{1F1F8}).
 *  Returns one entry per non-empty section. Null when fewer than two sections
 *  were found or the EN section is missing — callers then fall back to a single
 *  EN post with the whole text. */
export function splitLangSections(text: string): Partial<Record<PostLang, string>> | null {
  const hits = (Object.entries(POST_FLAGS) as [PostLang, string][])
    .map(([lang, flag]) => ({ lang, flag, idx: text.indexOf(flag) }))
    .filter((h) => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx);
  if (hits.length < 2) return null;
  const sections: Partial<Record<PostLang, string>> = {};
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].idx : text.length;
    const body = text.slice(h.idx + h.flag.length, end).trim();
    if (body !== '') sections[h.lang] = body;
  });
  return sections.en ? sections : null;
}

/** Validate 4-lang completeness: all required langs have body > minChars. */
const REQUIRED_LANGS: PostLang[] = ['en', 'vi', 'th', 'es'];
export function validate4Lang(sections: Partial<Record<PostLang, string>>, minChars = 50): { ok: boolean; missing: PostLang[] } {
  const missing = REQUIRED_LANGS.filter((l) => !sections[l] || (sections[l]?.length ?? 0) < minChars);
  return { ok: missing.length === 0, missing };
}

const RECAP_TITLES: Record<PostLang, string> = {
  en: 'Recap', vi: 'Nhìn lại', th: 'สรุปผล', es: 'Resumen',
};

/** Published posts rows for a recap (decision #19, 12/6: pick-driven newsroom,
 *  auto-publish). One row per language section when the split works (en/vi/th/es);
 *  one 'en' row with the whole text otherwise. Pure — exercised directly by unit tests. */
export function buildRecapPosts(pick: PickRow, text: string): NewPost[] {
  const score = `${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}`;
  const base = {
    type: 'recap' as const,
    slug: `recap-${slugify(pick.home_team)}-vs-${slugify(pick.away_team)}-${pick.home_score}-${pick.away_score}`,
    pick_ids: [pick.id],
    status: 'published' as const,
    published_at: new Date().toISOString(),
  };
  const sections = splitLangSections(text);
  if (!sections) {
    return [{ ...base, lang: 'en', title: `${RECAP_TITLES.en}: ${score}`, body_md: text.trim() }];
  }
  return (Object.entries(sections) as [PostLang, string][]).map(([lang, body]) => ({
    ...base, lang, title: `${RECAP_TITLES[lang]}: ${score}`, body_md: body,
  }));
}

/** Calls the Anthropic Messages API with a single user prompt.
 *  Returns the text, or null on any failure (never throws). */
export async function callClaude(
  env: { apiKey: string | undefined; model?: string },
  prompt: string,
  context: string,
  maxTokens = 500,
): Promise<string | null> {
  if (!env.apiKey) {
    log.warn(`${context}: ANTHROPIC_API_KEY unset — skipping`);
    return null;
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.model ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn(`${context}: Anthropic API returned ${res.status} — ${body.slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      log.warn(`${context}: unexpected Anthropic response shape`, JSON.stringify(data).slice(0, 400));
      return null;
    }
    return text.trim();
  } catch (err) {
    log.warn(`${context}: generation failed:`, err);
    return null;
  }
}

/** Channel recap (short, 4 languages). Returns the text, or null on any failure (never throws). */
export async function generateRecap(
  env: { apiKey: string | undefined; model?: string },
  pick: PickRow,
  record: SettledRecord,
): Promise<string | null> {
  // 4 × ≤60-word sections (Thai tokenizes heavily) — 500 default would truncate.
  return callClaude(env, buildRecapPrompt(pick, record), `recap pick ${pick.id}`, 1200);
}

/** Newsroom recap article prompt — longer than the channel recap, same honesty rules. */
export function buildRecapArticlePrompt(pick: PickRow, record: SettledRecord): string {
  const units = record.units > 0 ? `+${record.units}` : `${record.units}`;
  const pl = Number(pick.units_pl);

  return `<role>
You write post-match articles for the WildlyPlay newsroom (wildlyplay.com/news). Longer-form, thesis-driven analysis — honest about wins and losses alike.
</role>

<context>
League: ${pick.league}
Final score: ${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}
Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)
Outcome: ${pick.raw_outcome} (${pl > 0 ? `+${pl}` : pl} units)
Curator's pre-match thesis: ${pick.thesis}
Updated channel record: ${record.won}-${record.lost}-${record.push} (W-L-P), ${units} units total
</context>

<rules>
- Work ONLY from the data above — do not invent injuries, quotes, stats, or match events you cannot know.
- Honest transparency: state plainly whether the thesis played out or not — cover misses as openly as hits.
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose" or any promise of profit.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie".
- Lead with thesis evaluation — never a generic scoreline summary.
- End each section with the updated record line and this disclosure: "Human-picked, AI-written."
</rules>

<bad_examples>
BAD: "Team A beat Team B 3-1 in a dominant performance. The pick was correct and we take the win."
WHY: Generic scoreline recap, no thesis evaluation, "dominant performance" is filler with no analytical substance.
</bad_examples>

<good_examples>
GOOD: "The Over thesis needed three goals and got five — but four came after the 70th minute. The read was right on the game state; the first half would have tested anyone's nerve."
WHY: Evaluates thesis with specifics, honest about how the result unfolded, adds nuance.
</good_examples>

<output>
Write exactly FOUR sections in this order: English under a ${POST_FLAGS.en} header, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.
Each section: 150-250 words, markdown allowed (short paragraphs, no H1).
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) each language section is in the correct language, (4) thesis explicitly evaluated, (5) record line and disclosure present in every section.
</self_critique>`;
}

/** Recap article text for the newsroom; falls back to null on failure (never throws). */
export async function generateRecapArticle(
  env: { apiKey: string | undefined; model?: string },
  pick: PickRow,
  record: SettledRecord,
): Promise<string | null> {
  return callClaude(env, buildRecapArticlePrompt(pick, record), `recap article pick ${pick.id}`, 3500);
}
