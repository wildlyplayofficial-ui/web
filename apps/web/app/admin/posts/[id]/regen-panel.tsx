"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  publishDraftAction,
  discardDraftAction,
  clearStaleAction,
} from "@/lib/admin-actions";
import type { AdminPost, PostSibling, Lang4 } from "@/lib/types";

const LANGS: { value: Lang4; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { value: "vi", label: "Vietnamese", flag: "\u{1F1FB}\u{1F1F3}" },
  { value: "th", label: "Thai", flag: "\u{1F1F9}\u{1F1ED}" },
  { value: "es", label: "Spanish", flag: "\u{1F1EA}\u{1F1F8}" },
];

const SECTIONS = [
  { value: "title", label: "Title / Hook" },
  { value: "intro", label: "Introduction" },
  { value: "analysis", label: "Analysis" },
  { value: "conclusion", label: "Conclusion" },
];

const btnCls =
  "rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-card disabled:opacity-50";
const activeBtnCls =
  "rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-sm text-brand";
const selectCls =
  "rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink";

interface Props {
  post: AdminPost;
  siblings: PostSibling[];
}

export function RegenPanel({ post, siblings }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<string | null>(null);
  const [section, setSection] = useState("intro");
  const [targetLang, setTargetLang] = useState<Lang4>(
    post.lang === "en" ? "vi" : "en",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingLangs = [post.lang, ...siblings.map((s) => s.lang)];
  const missingLangs = LANGS.map((l) => l.value).filter(
    (l) => !existingLangs.includes(l),
  );

  async function handleGenerate() {
    if (!mode) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { postId: post.id, mode };
      if (mode === "regen_section") body.section = section;
      if (mode === "translate") body.targetLang = targetLang;
      const res = await fetch("/api/admin/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setLoading(true);
    const result = await publishDraftAction(post.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleDiscard() {
    if (!confirm("Discard this draft?")) return;
    setLoading(true);
    const result = await discardDraftAction(post.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleGenerateMissing(lang: Lang4) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, mode: "translate", targetLang: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-card p-4">
      <h3 className="font-display text-lg font-semibold">AI Regeneration</h3>

      {post.stale && (
        <div className="flex items-center justify-between rounded-md bg-yellow-900/30 px-3 py-2 text-sm text-yellow-300">
          <span>Content may be stale — a sibling language was regenerated.</span>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              const result = await clearStaleAction(post.id);
              if (result.error) setError(result.error);
              setLoading(false);
              router.refresh();
            }}
            disabled={loading}
            className="ml-3 rounded border border-yellow-500/50 px-2 py-0.5 text-xs hover:bg-yellow-900/50 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["regen_all", "Regen All"],
            ["regen_section", "Regen Section"],
            ["translate", "Translate"],
            ["regen_curator_note", "Regen Curator Note"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(mode === id ? null : id)}
            className={mode === id ? activeBtnCls : btnCls}
            disabled={loading}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Section picker */}
      {mode === "regen_section" && (
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className={selectCls}
        >
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {/* Translate picker */}
      {mode === "translate" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">
            {LANGS.find((l) => l.value === post.lang)?.flag}{" "}
            {post.lang.toUpperCase()} &rarr;
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as Lang4)}
            className={selectCls}
          >
            {LANGS.filter((l) => l.value !== post.lang).map((l) => (
              <option key={l.value} value={l.value}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate button */}
      {mode && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      )}

      {error && <p className="text-sm text-loss">{error}</p>}

      {/* Draft diff view */}
      {post.body_md_draft && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted">Draft Preview</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted">LIVE</p>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs whitespace-pre-wrap">
                {post.body_md || "(empty)"}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-brand">DRAFT</p>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-brand/30 bg-brand/5 p-3 font-mono text-xs whitespace-pre-wrap">
                {post.body_md_draft}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Publish Draft
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

      {/* Language coverage */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted">Language Coverage</h4>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => {
            const isCurrent = l.value === post.lang;
            const sibling = siblings.find((s) => s.lang === l.value);
            const exists = isCurrent || !!sibling;
            const isStale = isCurrent ? post.stale : sibling?.stale;
            const hasDraft = isCurrent
              ? !!post.body_md_draft
              : sibling?.has_draft;

            return (
              <span
                key={l.value}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                  !exists
                    ? "border-loss/30 text-loss"
                    : isStale
                      ? "border-yellow-500/30 text-yellow-300"
                      : "border-line text-ink"
                }`}
              >
                {l.flag} {l.value.toUpperCase()}
                {!exists && " missing"}
                {exists && isStale && " stale"}
                {hasDraft && " (draft)"}
              </span>
            );
          })}
        </div>
        {missingLangs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missingLangs.map((lang) => {
              const l = LANGS.find((x) => x.value === lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleGenerateMissing(lang)}
                  disabled={loading}
                  className="text-xs text-brand underline hover:no-underline disabled:opacity-50"
                >
                  Generate {l?.flag} {lang.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
