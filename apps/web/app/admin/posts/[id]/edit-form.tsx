"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { updatePostAction, deletePostAction } from "@/lib/admin-actions";
import type { Post, PostType } from "@/lib/types";

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "recap", label: "Recap" },
  { value: "preview", label: "Preview" },
  { value: "news", label: "News" },
  { value: "analysis", label: "Analysis" },
  { value: "no-play", label: "No-Play" },
  { value: "post-mortem", label: "Post-Mortem" },
];

const LANGS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
  { value: "th", label: "Thai" },
  { value: "es", label: "Spanish" },
] as const;

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none";
const labelCls = "mb-1 block text-sm text-muted";

export function EditPostForm({ post }: { post: Post }) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [bodyMd, setBodyMd] = useState(post.body_md);
  const [deleting, setDeleting] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await updatePostAction(formData);
      if (result.error) return { error: result.error };
      router.push("/admin/posts");
      return { error: null };
    },
    { error: null },
  );

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deletePostAction(post.id);
    if (result.error) {
      alert(result.error);
      setDeleting(false);
      return;
    }
    router.push("/admin/posts");
  }

  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="postId" value={post.id} />

        <div>
          <label htmlFor="title" className={labelCls}>Title</label>
          <input
            id="title"
            name="title"
            required
            defaultValue={post.title}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className={labelCls}>Type</label>
            <select id="type" name="type" required defaultValue={post.type} className={inputCls}>
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lang" className={labelCls}>Language</label>
            <select id="lang" name="lang" required defaultValue={post.lang} className={inputCls}>
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="body_md" className="text-sm text-muted">Body (Markdown)</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-muted transition-colors hover:text-ink"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
          <textarea
            id="body_md"
            name="body_md"
            rows={16}
            required
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            className={inputCls + " font-mono text-sm"}
          />
        </div>

        {showPreview && (
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="mb-2 text-xs font-medium text-muted">Preview</p>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm text-ink">
              {bodyMd}
            </div>
          </div>
        )}

        {state.error && <p className="text-sm text-loss">{state.error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-loss px-4 py-2 font-semibold text-loss transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>

      <div className="mt-4 rounded-lg border border-line bg-card p-3">
        <p className="text-xs text-muted">
          Slug: <span className="font-mono text-ink">{post.slug}</span>
          {" | "}
          Published: {post.published_at ? new Date(post.published_at).toLocaleString() : "Draft"}
        </p>
      </div>
    </>
  );
}
