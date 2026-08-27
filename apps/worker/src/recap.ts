/**
 * Milestone 4: AI-written post-match recap via the Anthropic Messages API (plain fetch, no SDK).
 * A recap failure must NEVER break the result announcement — every path returns null instead of throwing.
 */
import type { AuthorType, NewPost, PickRow, PostLang } from './store';
import { authorTypeOf } from './store';

/** Team name → URL-safe slug: "Türkiye" → "turkiye", "Bosnia and Herzegovina" → "bosnia-and-herzegovina". */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Knockout placeholder names (W98, RU2, etc.) that should never appear in articles. */
const PLACEHOLDER_TEAM_RE = /^(W|RU)\d+$/;
export function isPlaceholderTeam(name: string): boolean {
  return PLACEHOLDER_TEAM_RE.test(name.trim());
}

import { log } from './log';
import { NGON_NGU } from './ngon-ngu';

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

/** Tên tiếng Anh của từng ngôn ngữ — dùng trong prompt. */
export const LANG_NAMES: Record<PostLang, string> = {
  en: 'English', vi: 'Vietnamese', th: 'Thai', es: 'Spanish',
};

/** Chỉ thị output theo NGON_NGU (chỉ tiếng Việt, Peter 27/8) — thay cho câu
 *  "exactly FOUR sections..." cũ trong mọi prompt sinh bài. */
export function sectionSpec(): string {
  const list = NGON_NGU.map((l) => `${LANG_NAMES[l]} under a ${POST_FLAGS[l]} header`).join(', ');
  return NGON_NGU.length === 1
    ? `exactly ONE language section: ${list}`
    : `exactly ${NGON_NGU.length} language sections, in this order: ${list}`;
}

/** T7 disclosure text (Tiered Picks §12 firewall, launch blocker (a), Jane review 3/7) —
 *  keyed by server-derived AuthorType, NEVER the raw client `author` string, so a Scout
 *  pick can never render the Curator's "real_human" disclosure. Shared by every
 *  article-generation prompt (preview, recap article, post-mortem, analysis, no-play,
 *  watching-news) across all 4 newsroom languages. */
const DISCLOSURE: Record<AuthorType, Record<PostLang, string>> = {
  real_human: {
    en: 'Human-picked, AI-written.',
    vi: 'Con người chọn trận, AI viết bài.',
    th: 'มนุษย์เลือกเดิมพัน เขียนโดย AI',
    es: 'Elegido por un humano, escrito por IA.',
  },
  fictional_ai: {
    en: 'AI-picked, AI-written — Scout is an experimental AI persona, not a real person.',
    vi: 'AI chọn trận, AI viết bài — Trợ lý AI là nhân vật AI thử nghiệm, không phải người thật.',
    th: 'AI เลือกเดิมพัน เขียนโดย AI — Scout เป็นตัวละคร AI ทดลอง ไม่ใช่บุคคลจริง',
    es: 'Elegido por IA, escrito por IA — Scout es un personaje de IA experimental, no una persona real.',
  },
};

/** Disclosure text for a single language + author type. */
export function disclosureFor(authorType: AuthorType, lang: PostLang): string {
  return DISCLOSURE[authorType][lang];
}

/** Watching/no-play footer (Req 2): state-accurate — does NOT claim "chose this play". */
const WATCHING_DISCLOSURE: Record<PostLang, string> = {
  en: 'AI-written coverage. No play taken \u2014 we\u2019re watching this match, not betting it.',
  vi: 'B\u00e0i vi\u1ebft b\u1edfi AI. B\u00e0i n\u00e0y ch\u1ec9 theo d\u00f5i di\u1ec5n bi\u1ebfn tr\u1eadn \u0111\u1ea5u, kh\u00f4ng \u0111\u01b0a ra l\u1ef1a ch\u1ecdn n\u00e0o.',
  th: '\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e02\u0e35\u0e22\u0e19\u0e42\u0e14\u0e22 AI \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19 \u2014 \u0e40\u0e23\u0e32\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e19\u0e35\u0e49 \u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19',
  es: 'Cobertura escrita por IA. No se ha tomado ninguna apuesta \u2014 seguimos este partido, no apostamos.',
};

/** Watching disclosure for a single language. */
export function watchingDisclosureFor(lang: PostLang): string {
  return WATCHING_DISCLOSURE[lang];
}

/** Multi-line watching disclosure block for AI prompts. */
export function watchingDisclosureBlock(): string {
  return NGON_NGU
    .map((lang) => `  ${lang.toUpperCase()}: "${watchingDisclosureFor(lang)}"`)
    .join('\n');
}

/** Multi-line instruction block, one line per language, for insertion into a prompt's
 *  <rules> section — the model must match each section's own language to the line below. */
export function disclosureBlock(authorType: AuthorType): string {
  return NGON_NGU
    .map((lang) => `  ${lang.toUpperCase()}: "${disclosureFor(authorType, lang)}"`)
    .join('\n');
}

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

/** CLV context line for post-settlement prompts. Empty string when no closing
 *  odds were captured (odds_close null) — so the model is never handed a closing
 *  number it could editorialize, and cannot fabricate one it was never given. */
export function clvContextLine(pick: PickRow): string {
  if (pick.odds_close === null) return '';
  return `\nClosing odds: ${pick.odds_close} (published at ${pick.odds_publish})`;
}

/** Shared <rules> line governing how closing-line movement may be described.
 *  Factual, direction-preserving, banned-vocabulary-safe. */
export const CLV_RULE =
  '- Closing line: ONLY if a "Closing odds" figure is given above may you note how the price moved from publish to close — a lower closing number means the market moved toward this selection, a higher one means it moved away. State it as a neutral market-movement fact, never as proof the read was clever, and never with the banned vocabulary. If no closing odds are given, do NOT mention the closing line at all.';

/** Bản VI phải hợp pháp thị trường VN (Route A, 28/7). Nguồn duy nhất — inject vào
 *  MỌI prompt sinh section tiếng Việt (recap, preview, analysis, post-mortem, no-play,
 *  watching-news) để không generator nào lọt "kèo". Section TH/EN/ES không áp ràng buộc này. */
export const VI_LEXICON_RULE =
  '- VIETNAMESE LEXICON (bản VI phải hợp pháp thị trường VN — Route A, 28/7): trong section tiếng Việt, dùng "nhận định" (nội dung phân tích), "dự đoán" (lựa chọn có kết quả cụ thể), "phân tích", "chọn trận"; TUYỆT ĐỐI KHÔNG dùng "kèo", "nhà cái", "cá cược", "cá độ", "đặt cược", "lô đề", "soi kèo", "gỡ thua", "tài/xỉu", "đưa ra nhận định" — kể cả ở tiêu đề. (Section Thái/Anh/Tây Ban Nha không áp ràng buộc này.)\n' +
  '- TÊN NHÂN VẬT BẢN VI (Nick chốt 21/8): trong section tiếng Việt gọi Curator là "Admin" và Scout là "Trợ lý AI" — TUYỆT ĐỐI KHÔNG để nguyên chữ "Curator" hay "Scout" trong bản VI. (Section EN/TH/ES giữ nguyên tên gốc.)';

/** Betting-specific closing-line phrasing. Deliberately narrow so ordinary
 *  football language ("closing stages", "closed out the win") never matches. */
const CLOSING_LINE_MENTION = /\bclosing (?:odds|line|price)\b|\bclosed at \d/i;

/** No-Fabricated-Fact lint (Jane 7/7): recap auto-publishes with no human gate,
 *  so this backs up the structural clvContextLine guard. When no closing odds
 *  were captured (odds_close null), the prose must not reference a closing line.
 *  Returns a reason string to block on, or null when clean. English-only, like
 *  the polarity guard — other languages spell it differently and rely on the
 *  prompt-level rule instead. */
export function detectClosingLineFabrication(oddsClose: number | null, enBody: string): string | null {
  if (oddsClose !== null) return null;
  const m = enBody.match(CLOSING_LINE_MENTION);
  return m ? `closing-line reference with no captured odds_close: "${m[0]}"` : null;
}

export function buildRecapPrompt(pick: PickRow, record: SettledRecord): string {
  const units = record.units > 0 ? `+${record.units}` : `${record.units}`;
  const pl = Number(pick.units_pl);

  // Chỉ tiếng Việt (Peter 27/8) — cùng giao thức cờ 🇻🇳 với bài newsroom.
  return `<role>
You write post-match recaps for banhbong.net's public Telegram channel. Short, honest, thesis-driven — every recap evaluates whether the pre-match read was right.
</role>

<context>
League: ${pick.league}
Final score: ${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}
Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)${clvContextLine(pick)}
Outcome: ${pick.raw_outcome} (${pl > 0 ? `+${pl}` : pl} units)
Curator's pre-match thesis: ${pick.thesis}
Updated channel record: ${record.won}-${record.lost}-${record.push} (W-L-P), ${units} units total
</context>

<rules>
- Honest transparency: state plainly whether the thesis played out or not — recap misses as openly as hits.
- Work ONLY from the data above — do not invent match events, xG, or stats you cannot know.
${CLV_RULE}
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose" or any promise of profit.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie".
${VI_LEXICON_RULE}
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
Write ${sectionSpec()}.
Each section: 60 words or fewer.
</output>

<self_critique>
Before outputting, verify: (1) no banned vocabulary even negated, (2) no facts not in the provided data, (3) each language section is in the correct language, (4) thesis explicitly evaluated, (5) record line present in every section.
</self_critique>`;
}

/** Split AI output on the flag headers (any subset/order of \u{1F1EC}\u{1F1E7}/\u{1F1FB}\u{1F1F3}/\u{1F1F9}\u{1F1ED}/\u{1F1EA}\u{1F1F8}).
 *  Chỉ tiếng Việt (Peter 27/8): chỉ giữ các section thuộc NGON_NGU — section
 *  en/th/es lạc vào (model tự ý sinh thêm) bị bỏ, không bao giờ thành post row.
 *  Null khi không tìm thấy cờ nào hoặc thiếu section NGON_NGU[0] — caller
 *  fallback về MỘT post NGON_NGU[0] với nguyên văn text. */
export function splitLangSections(text: string): Partial<Record<PostLang, string>> | null {
  const hits = (Object.entries(POST_FLAGS) as [PostLang, string][])
    .map(([lang, flag]) => ({ lang, flag, idx: text.indexOf(flag) }))
    .filter((h) => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx);
  if (hits.length === 0) return null;
  const sections: Partial<Record<PostLang, string>> = {};
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].idx : text.length;
    const body = text.slice(h.idx + h.flag.length, end).trim();
    if (body !== '') sections[h.lang] = body;
  });
  const kept: Partial<Record<PostLang, string>> = {};
  for (const lang of NGON_NGU) if (sections[lang]) kept[lang] = sections[lang];
  return kept[NGON_NGU[0]] ? kept : null;
}

/** Validate NGON_NGU completeness: mọi ngôn ngữ cấu hình phải có body > minChars. */
export function validateLangs(sections: Partial<Record<PostLang, string>>, minChars = 50): { ok: boolean; missing: PostLang[] } {
  const missing = NGON_NGU.filter((l) => !sections[l] || (sections[l]?.length ?? 0) < minChars);
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
    author: pick.author,
  };
  const sections = splitLangSections(text);
  if (!sections) {
    return [{ ...base, lang: NGON_NGU[0], title: `${RECAP_TITLES[NGON_NGU[0]]}: ${score}`, body_md: text.trim() }];
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
You write post-match articles for the banhbong.net newsroom (banhbong.net/news). Longer-form, thesis-driven analysis — honest about wins and losses alike.
</role>

<context>
League: ${pick.league}
Final score: ${pick.home_team} ${pick.home_score}-${pick.away_score} ${pick.away_team}
Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'}, stake: ${Number(pick.stake_units)} units)${clvContextLine(pick)}
Outcome: ${pick.raw_outcome} (${pl > 0 ? `+${pl}` : pl} units)
Curator's pre-match thesis: ${pick.thesis}
Updated channel record: ${record.won}-${record.lost}-${record.push} (W-L-P), ${units} units total
</context>

<rules>
- Work ONLY from the data above — do not invent injuries, quotes, stats, or match events you cannot know.
- Honest transparency: state plainly whether the thesis played out or not — cover misses as openly as hits.
${CLV_RULE}
- Responsible language: NEVER use "sure win", "guaranteed", "can't lose" or any promise of profit.
- BANNED VOCABULARY (do not use these words even in negated form): "edge", "value", "value bet", "+EV", "beat the bookie".
${VI_LEXICON_RULE}
- Lead with thesis evaluation — never a generic scoreline summary.
- End each section with the updated record line, followed by this disclosure as plain text, matching that section's own language exactly:
${disclosureBlock(authorTypeOf(pick.author))}
</rules>

<bad_examples>
BAD: "Team A beat Team B 3-1 in a dominant performance. The pick was correct and we take the win."
WHY: Generic scoreline recap, no thesis evaluation, "dominant performance" is filler with no analytical substance.
</bad_examples>

<good_examples>
GOOD: "The Over thesis needed three goals and got five — but four came after the 70th minute. The read was right on the game state; the first half would have tested anyone's nerve."
WHY: Evaluates thesis with specifics, honest about how the result unfolded, adds nuance.
GOOD (closing line, only when 'Closing odds' is supplied): "Posted at 2.05 and closed at 1.85 — the market moved toward this side after we published, even though the result went the other way."
WHY: States the price move as a plain fact, keeps the numbers exact, stays honest about the miss, uses no banned vocabulary.
</good_examples>

<output>
Write ${sectionSpec()}.
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
