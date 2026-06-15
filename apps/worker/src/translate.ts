/**
 * Thesis translations: the Curator writes the thesis in English, the web UI is
 * 4-language — AI translates the thesis into vi/th/es and stores it in
 * pick_content. A translation failure must NEVER break the pick publication —
 * every path logs and returns (same contract as preview.ts).
 */
import { callClaude, DEFAULT_MODEL, POST_FLAGS, splitLangSections } from './recap';
import type { NewPickContent, PickRow, PostLang, Store } from './store';
import { log } from './log';

export function buildThesisTranslationPrompt(pick: PickRow): string {
  return [
    'You translate betting theses for WildlyPlay (wildlyplay.com), a football picks site.',
    '',
    "The Curator (human) wrote this pick's thesis in English:",
    `- Match: ${pick.home_team} vs ${pick.away_team} (${pick.league})`,
    `- Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'})`,
    `- Thesis: ${pick.thesis}`,
    '',
    `Output the thesis in exactly FOUR sections, in this order: English under a ${POST_FLAGS.en} header, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.`,
    'Rules:',
    '- The English section is the original thesis, echoed verbatim.',
    '- The other three sections are faithful translations of the thesis — same meaning, same length, nothing added or removed.',
    '- Use the betting terminology that readers of each language actually use (e.g. natural Asian handicap terms).',
    '- This is a translation, not analysis: do NOT add opinions, hype or any promise of profit.',
    '- Output plain text only — no markdown, no commentary outside the four sections.',
  ].join('\n');
}

const THESIS_LANGS: readonly PostLang[] = ['vi', 'th', 'es'];

/** pick_content rows from the AI output — vi/th/es only, the EN section is just
 *  the verbatim echo that keeps splitLangSections happy. Pure. Returns [] when
 *  the split fails or no translated section came back. */
export function buildThesisContentRows(
  pick: PickRow,
  text: string,
  model: string = DEFAULT_MODEL,
): NewPickContent[] {
  const sections = splitLangSections(text);
  if (!sections) return [];
  return THESIS_LANGS
    .filter((lang) => sections[lang])
    .map((lang) => ({
      pick_id: pick.id,
      lang,
      title: pick.selection,
      body_md: sections[lang] as string,
      model,
    }));
}

/** Generate + store the thesis translations for a fresh pick. Never throws. */
export async function publishThesisTranslations(
  deps: { store: Store; env: { apiKey: string | undefined; model?: string } },
  pick: PickRow,
): Promise<void> {
  try {
    const text = await callClaude(
      deps.env, buildThesisTranslationPrompt(pick), `thesis translation pick ${pick.id}`, 1000,
    );
    if (text === null) return;
    const rows = buildThesisContentRows(pick, text, deps.env.model ?? DEFAULT_MODEL);
    if (rows.length === 0) {
      log.warn(`thesis translation for pick ${pick.id}: language split failed — skipping`);
      return;
    }
    await deps.store.upsertPickContent(rows);
    log.info(`stored thesis translations for pick ${pick.id} (${rows.map((r) => r.lang).join(', ')})`);
  } catch (err) {
    log.warn(`thesis translation failed for pick ${pick.id} — pick already published:`, err);
  }
}
