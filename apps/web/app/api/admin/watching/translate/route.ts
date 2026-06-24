/**
 * POST /api/admin/watching/translate
 * Translate watching note EN → missing languages (VI/TH/ES).
 * Auth: Supabase session. Writes to note_translations_draft (never live).
 * Model: Haiku (pure translation, no content generation).
 */
import { getAdminSession } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase-server";
import { callClaude, SONNET, LANG_NAMES } from "@/lib/ai";
import type { Lang4 } from "@/lib/types";

const ALL_LANGS: Lang4[] = ["en", "vi", "th", "es"];

const BETTING_GLOSSARY: Record<string, Record<string, string>> = {
  vi: {
    favourite: "cửa trên",
    underdog: "cửa dưới",
    handicap: "kèo chấp",
    "over/under": "tài xỉu",
    total: "tổng bàn",
    stake: "mức cược",
    odds: "tỷ lệ kèo",
    line: "mức chấp",
  },
  th: {
    favourite: "ทีมเต็ง",
    underdog: "ทีมรอง",
    handicap: "แฮนดิแคป",
    "over/under": "สูง/ต่ำ",
    total: "รวมประตู",
    stake: "เงินเดิมพัน",
    odds: "ราคาต่อรอง",
    line: "ราคาแฮนดิแคป",
  },
  es: {
    favourite: "favorito",
    underdog: "no favorito",
    handicap: "hándicap",
    "over/under": "más/menos",
    total: "total de goles",
    stake: "apuesta",
    odds: "cuota",
    line: "línea de hándicap",
  },
};

function buildTranslatePrompt(note: string, targetLang: string): string {
  const glossary = BETTING_GLOSSARY[targetLang];
  const glossaryLines = glossary
    ? Object.entries(glossary)
        .map(([en, local]) => `  ${en} → ${local}`)
        .join("\n")
    : "";

  return `You are translating football betting/tipster notes for a sports analysis website. Translate the following English text to ${LANG_NAMES[targetLang]}.

CRITICAL RULES:
1. Preserve ALL numbers, odds, percentages EXACTLY as written ("-1", "61%", "2.25", "2.5", "Over 2.5").
2. Preserve team names as proper nouns (Colombia, Congo DR, etc.).
3. Translate EVERY word — do NOT leave any English phrases untranslated.
4. Use natural betting vernacular for the target language. Key terms:
${glossaryLines}
5. Preserve paragraph structure. Do not add or remove content.

---
${note}
---`;
}

export async function POST(request: Request): Promise<Response> {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { watchingId } = await request.json();
  if (!watchingId)
    return Response.json({ error: "watchingId required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );

  const sb = getServiceSupabase();
  if (!sb)
    return Response.json({ error: "Database not configured" }, { status: 500 });

  const { data: w } = await sb
    .from("watching")
    .select("note, note_translations")
    .eq("id", watchingId)
    .single();

  if (!w) return Response.json({ error: "Watching not found" }, { status: 404 });
  if (!w.note?.trim())
    return Response.json(
      { error: "No note to translate — note is empty" },
      { status: 400 },
    );

  // Find missing languages
  const existing = w.note_translations ?? {};
  const missingLangs = ALL_LANGS.filter(
    (l) => l !== "en" && (!existing[l] || existing[l].trim() === ""),
  );

  if (missingLangs.length === 0) {
    return Response.json({ error: "All languages already have translations" }, { status: 400 });
  }

  // Translate to each missing language
  const draft: Record<string, string> = {};
  for (const lang of missingLangs) {
    const prompt = buildTranslatePrompt(w.note, lang);
    const text = await callClaude(apiKey, SONNET, prompt, 1500);
    if (text) {
      draft[lang] = text;
    }
  }

  if (Object.keys(draft).length === 0) {
    return Response.json({ error: "Translation failed for all languages" }, { status: 502 });
  }

  // Save draft (not live)
  await sb
    .from("watching")
    .update({ note_translations_draft: draft })
    .eq("id", watchingId);

  return Response.json({
    ok: true,
    translatedLangs: Object.keys(draft),
    draft,
  });
}
