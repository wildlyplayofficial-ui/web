/**
 * Thesis translation: the Curator writes the thesis in English, the web is
 * Vietnamese-only (Peter 27/8) — AI translates the thesis into vi and stores it
 * in pick_content. A translation failure must NEVER break the pick publication —
 * every path logs and returns (same contract as preview.ts).
 */
import { callClaude, DEFAULT_MODEL, LANG_NAMES, POST_FLAGS, splitLangSections } from './recap';
import { NGON_NGU } from './ngon-ngu';
import { callSoldier, isUsableText, soldierEnabled } from './soldier';
import type { NewPickContent, PickRow, PostLang, Store } from './store';
import { log } from './log';

export function buildThesisTranslationPrompt(pick: PickRow): string {
  return [
    'You translate betting theses for banhbong.net (banhbong.net), a football picks site.',
    '',
    "The Curator (human) wrote this pick's thesis in English:",
    `- Match: ${pick.home_team} vs ${pick.away_team} (${pick.league})`,
    `- Pick: ${pick.selection} @ ${pick.odds_publish} (market: ${pick.market}, line: ${pick.line ?? 'n/a'})`,
    `- Thesis: ${pick.thesis}`,
    '',
    `Output the translated thesis in ${THESIS_LANGS.length === 1 ? 'exactly ONE section' : `exactly ${THESIS_LANGS.length} sections, in this order`}: ${THESIS_LANGS.map((l) => `${LANG_NAMES[l]} under a ${POST_FLAGS[l]} header`).join(', ')}.`,
    'Rules:',
    '- Each section is a faithful translation of the thesis — same meaning, same length, nothing added or removed.',
    '- Use the terminology that readers of that language actually use (e.g. natural Asian handicap terms).',
    '- This is a translation, not analysis: do NOT add opinions, hype or any promise of profit.',
    '- Output plain text only — no markdown, no commentary outside the flag-headed sections.',
    // Nick chốt 23/8: bản tiếng Việt gọi Curator/Admin là "Chú Tám Banh", Scout là
    // "Trợ lý AI". Không dặn thì máy dịch bê nguyên tên tiếng Anh vào bài (đo 23/8:
    // 77 bài tiếng Việt đã đăng còn chữ "Admin").
    '- Name rule for the Vietnamese section: write "Chú Tám Banh" wherever the English says the Curator or Admin, and "Trợ lý AI" wherever it says the Scout. Never leave the words Curator, Admin or Scout in the Vietnamese text.',
  ].join('\n');
}

// Chỉ tiếng Việt (Peter 27/8): note gốc của Nick là EN → chỉ dịch sang vi.
const THESIS_LANGS: readonly PostLang[] = NGON_NGU;

/** pick_content rows from the AI output — THESIS_LANGS (= NGON_NGU) only.
 *  Pure. Returns [] when the split fails or no translated section came back. */
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

/** Languages asked for but absent from the rows. Pure. */
export function missingThesisLangs(rows: NewPickContent[]): PostLang[] {
  return THESIS_LANGS.filter((lang) => !rows.some((r) => r.lang === lang));
}

/** Generate + store the thesis translations for a fresh pick. Never throws.
 *  A partial result is a failure, not a success: the model has come back with
 *  only one of the three sections before (pick 12552f7b, 16/8 — th only, vi and
 *  es silently absent), and the old code logged that as stored. Retry once, keep
 *  whichever attempt was more complete, and say out loud what is still missing. */
export async function publishThesisTranslations(
  deps: {
    store: Store;
    env: { apiKey: string | undefined; model?: string };
    /** ISR revalidate — without it the first render (pre-translation) sticks in
     *  cache for 300s and the page shows the English thesis (Nick caught this
     *  live on Hull vs MU, 22/8). Fire-and-forget like everything else here. */
    revalidate?: (tags: string[]) => Promise<void> | void;
  },
  pick: PickRow,
): Promise<void> {
  try {
    let rows: NewPickContent[] = [];
    // Đàn lính first (Peter 22/8): free Groq does the muscle work, Claude stays
    // as the fallback so a dead/slow soldier can never degrade below today.
    if (soldierEnabled()) {
      const text = await callSoldier(buildThesisTranslationPrompt(pick), `thesis translation pick ${pick.id}`, 1500);
      if (text !== null) {
        const soldierRows = buildThesisContentRows(pick, text, process.env.SOLDIER_MODEL ?? 'groq/gpt-oss-120b');
        // Đủ 3 ngôn ngữ CHƯA phải là đạt: bản dịch cụt vẫn tính là "có mặt".
        // Bản dịch trung thành thì không thể ngắn hơn nhiều so với bản gốc.
        const minChars = Math.max(60, Math.round(pick.thesis.length * 0.45));
        const badLangs = soldierRows.filter((r) => !isUsableText(r.body_md, { minChars })).map((r) => r.lang);
        if (missingThesisLangs(soldierRows).length === 0 && badLangs.length === 0) rows = soldierRows;
        else log.warn(`soldier thesis translation for pick ${pick.id} không dùng được (thiếu: ${missingThesisLangs(soldierRows).join(', ') || 'không'} · cụt: ${badLangs.join(', ') || 'không'}) — chuyển sang Claude`);
      }
    }
    for (let attempt = 1; rows.length === 0 || missingThesisLangs(rows).length > 0; attempt++) {
      if (attempt > 2) break;
      const text = await callClaude(
        deps.env, buildThesisTranslationPrompt(pick), `thesis translation pick ${pick.id}`, 1000,
      );
      if (text === null) break;
      const attemptRows = buildThesisContentRows(pick, text, deps.env.model ?? DEFAULT_MODEL);
      if (attemptRows.length === 0) {
        log.warn(`thesis translation for pick ${pick.id}: language split failed (attempt ${attempt}) — raw: ${text.slice(0, 300)}`);
      }
      if (attemptRows.length > rows.length) rows = attemptRows;
      if (missingThesisLangs(rows).length === 0) break;
      log.warn(`thesis translation for pick ${pick.id}: missing ${missingThesisLangs(rows).join(', ')} (attempt ${attempt})`);
    }

    if (rows.length === 0) {
      log.warn(`thesis translation for pick ${pick.id}: nothing usable after 2 attempts — skipping`);
      return;
    }
    await deps.store.upsertPickContent(rows);
    // Bust the ISR cache so /play swaps to the translated thesis within seconds
    // instead of the full 300s revalidate window.
    if (deps.revalidate) {
      try { await deps.revalidate(['picks']); } catch { /* fire-and-forget */ }
    }
    const missing = missingThesisLangs(rows);
    if (missing.length > 0) {
      log.warn(`stored PARTIAL thesis translations for pick ${pick.id} (${rows.map((r) => r.lang).join(', ')}) — still missing ${missing.join(', ')}`);
    } else {
      log.info(`stored thesis translations for pick ${pick.id} (${rows.map((r) => r.lang).join(', ')})`);
    }
  } catch (err) {
    log.warn(`thesis translation failed for pick ${pick.id} — pick already published:`, err);
  }
}
