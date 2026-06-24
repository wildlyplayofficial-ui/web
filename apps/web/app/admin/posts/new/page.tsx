"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/lib/admin-actions";
import type { PostType } from "@/lib/types";

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

export default function NewPostPage() {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await createPostAction(formData);
      if (result.error) return { error: result.error };
      router.push("/admin/posts");
      return { error: null };
    },
    { error: null },
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">New Post</h1>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="title" className={labelCls}>Title</label>
          <input
            id="title"
            name="title"
            required
            placeholder="Match recap: Spain vs Germany"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className={labelCls}>Type</label>
            <select id="type" name="type" required defaultValue="news" className={inputCls}>
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lang" className={labelCls}>Language</label>
            <select id="lang" name="lang" required defaultValue="en" className={inputCls}>
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="body_md" className={labelCls}>Body (Markdown)</label>
          <textarea
            id="body_md"
            name="body_md"
            rows={16}
            required
            placeholder="Write your post content in Markdown..."
            className={inputCls + " font-mono text-sm"}
          />
        </div>

        {state.error && <p className="text-sm text-loss">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create Post"}
        </button>
      </form>
    </div>
  );
}
