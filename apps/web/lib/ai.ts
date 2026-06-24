/**
 * AI utilities for admin post regeneration (Phase 2).
 * Mirrors worker's callClaude + splitLangSections — kept in web for admin-only use.
 */

const TIMEOUT_MS = 120_000;

export const HAIKU = "claude-haiku-4-5-20251001";
export const SONNET = "claude-sonnet-4-6";

export const POST_FLAGS: Record<string, string> = {
  en: "\u{1F1EC}\u{1F1E7}",
  vi: "\u{1F1FB}\u{1F1F3}",
  th: "\u{1F1F9}\u{1F1ED}",
  es: "\u{1F1EA}\u{1F1F8}",
};

export const LANG_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  th: "Thai",
  es: "Spanish",
};

/** Call Anthropic Messages API. Returns text or null on failure (never throws). */
export async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data: { content?: { text?: string }[] } = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

/** Split AI output on flag headers into per-language sections.
 *  Returns null when fewer than 2 sections or EN is missing. */
export function splitLangSections(
  text: string,
): Partial<Record<string, string>> | null {
  const hits = Object.entries(POST_FLAGS)
    .map(([lang, flag]) => ({ lang, flag, idx: text.indexOf(flag) }))
    .filter((h) => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx);
  if (hits.length < 2) return null;
  const sections: Record<string, string> = {};
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].idx : text.length;
    const body = text.slice(h.idx + h.flag.length, end).trim();
    if (body) sections[h.lang] = body;
  });
  return sections.en ? sections : null;
}

/** Strict split: requires ALL 4 lang flags present with non-empty content.
 *  Prevents lang contamination when model forgets a flag (text leaks into
 *  previous section). Returns null if any lang missing → caller uses raw fallback. */
export function splitLangSectionsStrict(
  text: string,
): Record<string, string> | null {
  const ALL_LANGS = ["en", "vi", "th", "es"];
  const sections = splitLangSections(text);
  if (!sections) return null;
  for (const lang of ALL_LANGS) {
    if (!sections[lang] || sections[lang]!.length < 30) return null;
  }
  return sections as Record<string, string>;
}
