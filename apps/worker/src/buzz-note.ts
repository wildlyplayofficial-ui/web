/**
 * Watching note translation: translates the Curator's note into 4 languages
 * and stores as note_translations jsonb on the watching row.
 * REQ 5: also propagates translations into published presence posts.
 * A translation failure must NEVER break the watching pipeline — every path logs and returns.
 */
import { callClaude, POST_FLAGS, splitLangSections, watchingDisclosureFor } from './recap';
import { buildNewsSlug } from './watching-news';
import type { PostLang, Store, WatchingRow } from './store';
import { log } from './log';

type NoteLang = 'en' | 'vi' | 'th' | 'es';

export function buildNoteTranslationPrompt(w: WatchingRow): string {
  return `Translate this football note into 4 languages. Output EXACTLY this format — each section starts with the flag emoji ALONE on its own line, then the text below it:

${POST_FLAGS.en}
${w.note}

${POST_FLAGS.vi}
[Vietnamese translation here]

${POST_FLAGS.th}
[Thai translation here]

${POST_FLAGS.es}
[Spanish translation here]

Rules:
- English section = original note verbatim.
- Other sections = faithful translations, same meaning, nothing added.
- Use each language's natural football terminology.
- Output ONLY the 4 flag-headed sections, nothing else.`;
}

/** Parse flag-delimited sections into a lang→text record. Returns null on failure. */
export function parseNoteTranslations(
  text: string,
): Record<NoteLang, string> | null {
  const sections = splitLangSections(text);
  if (!sections) return null;

  const langs: NoteLang[] = ['en', 'vi', 'th', 'es'];
  for (const lang of langs) {
    if (!sections[lang]) return null;
  }

  return {
    en: sections.en!,
    vi: sections.vi!,
    th: sections.th!,
    es: sections.es!,
  };
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
  translations: Record<NoteLang, string>,
): Promise<void> {
  const slug = buildNewsSlug(watching.home_team, watching.away_team, watching.kickoff_utc);
  const langs: PostLang[] = ['en', 'vi', 'th', 'es'];

  for (const lang of langs) {
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
