"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  publishWatchingTranslationAction,
  discardWatchingTranslationAction,
} from "@/lib/admin-actions";
import type { Lang4 } from "@/lib/types";

const LANGS: { value: Lang4; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { value: "vi", label: "Vietnamese", flag: "\u{1F1FB}\u{1F1F3}" },
  { value: "th", label: "Thai", flag: "\u{1F1F9}\u{1F1ED}" },
  { value: "es", label: "Spanish", flag: "\u{1F1EA}\u{1F1F8}" },
];

interface Props {
  watchingId: string;
  note: string;
  translations: Record<string, string> | null;
  draft: Record<string, string> | null;
}

export function TranslatePanel({ watchingId, note, translations, draft }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = translations ?? {};
  const missingLangs = LANGS.filter(
    (l) => l.value !== "en" && (!existing[l.value] || !existing[l.value].trim()),
  );

  async function handleTranslate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/watching/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setLoading(true);
    const result = await publishWatchingTranslationAction(watchingId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleDiscard() {
    if (!confirm("Discard translation draft?")) return;
    setLoading(true);
    const result = await discardWatchingTranslationAction(watchingId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-card p-4">
      <h3 className="font-display text-lg font-semibold">Note Translations</h3>

      {/* Current translations */}
      <div className="space-y-2">
        {LANGS.map((l) => {
          const text =
            l.value === "en" ? note : existing[l.value] || null;
          return (
            <div key={l.value} className="text-sm">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                  text
                    ? "border-line text-ink"
                    : "border-loss/30 text-loss"
                }`}
              >
                {l.flag} {l.value.toUpperCase()}
                {!text && " missing"}
              </span>
              {text && (
                <p className="mt-1 whitespace-pre-wrap pl-2 text-muted">
                  {text.length > 200 ? text.slice(0, 200) + "..." : text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Generate missing button */}
      {missingLangs.length > 0 && !draft && (
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? "Translating..."
            : `Generate ${missingLangs.map((l) => l.flag).join(" ")} translations`}
        </button>
      )}

      {error && <p className="text-sm text-loss">{error}</p>}

      {/* Draft review */}
      {draft && Object.keys(draft).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted">
            Translation Draft — Review before publishing
          </h4>
          {Object.entries(draft).map(([lang, text]) => {
            const l = LANGS.find((x) => x.value === lang);
            return (
              <div
                key={lang}
                className="rounded-lg border border-brand/30 bg-brand/5 p-3"
              >
                <p className="mb-1 text-xs font-medium text-brand">
                  {l?.flag} {lang.toUpperCase()} (draft)
                </p>
                <p className="whitespace-pre-wrap text-sm text-ink">{text}</p>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Publish Translations
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={loading}
              className="rounded-lg border border-loss px-3 py-1.5 text-sm text-loss transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
