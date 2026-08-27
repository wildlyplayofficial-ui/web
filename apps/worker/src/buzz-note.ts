/**
 * Watching note translation: translates the Curator's note into NGON_NGU
 * (chỉ tiếng Việt, Peter 27/8) and stores as note_translations jsonb on the watching row.
 * REQ 5: also propagates translations into published presence posts.
 * A translation failure must NEVER break the watching pipeline — every path logs and returns.
 */
import { callClaude, LANG_NAMES, POST_FLAGS, splitLangSections, VI_LEXICON_RULE, watchingDisclosureFor } from './recap';
import { NGON_NGU } from './ngon-ngu';
import { buildNewsSlug } from './watching-news';
import type { PostLang, Store, WatchingRow } from './store';
import { log } from './log';

/** Ngôn ngữ đích của bản dịch note — NGON_NGU trừ EN (note gốc đã là EN). */
const TARGET_LANGS: readonly PostLang[] = NGON_NGU.filter((l) => l !== 'en');

export function buildNoteTranslationPrompt(w: WatchingRow): string {
  const blocks = TARGET_LANGS
    .map((l) => `${POST_FLAGS[l]}\n[${LANG_NAMES[l]} translation here]`)
    .join('\n\n');
  return `Translate this football note for the match ${w.home_team} vs ${w.away_team} into ${TARGET_LANGS.map((l) => LANG_NAMES[l]).join(', ')}. Output EXACTLY this format — each section starts with the flag emoji ALONE on its own line, then the text below it:

${blocks}

The note (English):
${w.note}

Rules:
- Each section = a faithful translation of the note, same meaning, nothing added.
- Use the language's natural football terminology.
${VI_LEXICON_RULE}
- Output ONLY the flag-headed section(s), nothing else.`;
}

/** Parse flag-delimited sections into a lang→text record. Returns null on failure. */
export function parseNoteTranslations(
  text: string,
): Partial<Record<PostLang, string>> | null {
  const sections = splitLangSections(text);
  if (!sections) return null;

  for (const lang of TARGET_LANGS) {
    if (!sections[lang]) return null;
  }

  const out: Partial<Record<PostLang, string>> = {};
  for (const lang of TARGET_LANGS) out[lang] = sections[lang];
  return out;
}

/** Translate + store note translations for a watching row. Never throws. */
export async function translateWatchingNote(
  deps: { store: Store; env: { apiKey: string | undefined; model?: string }; revalidate?: (tags: string[]) => Promise<void> },
  watching: WatchingRow,
): Promise<void> {
  try {
    if (!watching.note) return;

    const text = await callClaude(
      deps.env,
      buildNoteTranslationPrompt(watching),
      `note translation watching ${watching.id}`,
      5000,
    );
    if (!text) return;

    const translations = parseNoteTranslations(text);
    if (!translations) {
      log.warn(`note translation for watching ${watching.id}: language split failed — skipping`);
      return;
    }

    await deps.store.updateWatching(watching.id, { note_translations: translations });
    if (deps.revalidate) void deps.revalidate(['watching']);
    log.info(`stored note translations for watching ${watching.id}`);

    // REQ 5: propagate translated note into already-published presence posts
    if (watching.presence) {
      await propagateNoteToPresencePosts(deps.store, watching, translations);
      if (deps.revalidate) void deps.revalidate(['posts']);
    }
  } catch (err) {
    log.warn(`note translation failed for watching ${watching.id} — watching already published:`, err);
  }
}

/** REQ 5: update published presence posts with localized note text.
 *  Each lang's post body = translated note + watching disclosure footer. */
export async function propagateNoteToPresencePosts(
  store: Store,
  watching: WatchingRow,
  translations: Partial<Record<PostLang, string>>,
): Promise<void> {
  const slug = buildNewsSlug(watching.home_team, watching.away_team, watching.kickoff_utc);

  for (const lang of NGON_NGU) {
    const note = translations[lang];
    if (!note) continue;
    const footer = watchingDisclosureFor(lang);
    const body = `${note}\n\n${footer}`;
    try {
      await store.updatePostBody(slug, lang, body);
    } catch (err) {
      log.warn(`propagateNoteToPresencePosts: failed to update ${slug}/${lang}:`, err);
    }
  }
  log.info(`propagated note translations to presence posts for ${slug}`);
}
