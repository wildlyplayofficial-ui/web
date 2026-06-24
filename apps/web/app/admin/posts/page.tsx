import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminPosts } from "@/lib/admin-data";
import { deletePostAction } from "@/lib/admin-actions";
import type { PostType } from "@/lib/types";

const POST_TYPES: readonly PostType[] = [
  "recap", "preview", "news", "analysis", "no-play", "post-mortem",
];

const TYPE_STYLES: Record<string, string> = {
  recap: "bg-brand-dim text-brand",
  preview: "bg-indigo-soft/20 text-indigo-soft",
  news: "bg-card-hover text-muted",
  analysis: "bg-brand-dim text-brand",
  "no-play": "bg-loss-dim text-loss",
  "post-mortem": "bg-card-hover text-muted",
};

function TypeBadge({ type }: { type: PostType }) {
  const style = TYPE_STYLES[type] ?? "bg-card-hover text-muted";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
      {type}
    </span>
  );
}

async function handleDelete(postId: string): Promise<void> {
  "use server";
  await deletePostAction(postId);
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPostsPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const typeFilter = String(sp.type ?? "all");
  const { items: posts, totalPages, total } = await getAdminPosts(page, 20, typeFilter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">
          Posts <span className="text-sm font-normal text-muted">({total})</span>
        </h1>
        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          New Post
        </Link>
      </div>

      {/* Type filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/posts"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            typeFilter === "all" ? "bg-brand text-bg" : "bg-card-hover text-muted hover:text-ink"
          }`}
        >
          All
        </Link>
        {POST_TYPES.map((t) => (
          <Link
            key={t}
            href={`/admin/posts?type=${t}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === t ? "bg-brand text-bg" : "bg-card-hover text-muted hover:text-ink"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Lang</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-line/50">
                  <td className="max-w-xs truncate px-3 py-3 font-medium">
                    {post.title}
                  </td>
                  <td className="px-3 py-3">
                    <TypeBadge type={post.type} />
                  </td>
                  <td className="px-3 py-3 text-muted uppercase">{post.lang}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-md bg-brand-dim px-2 py-0.5 text-xs font-medium text-brand">
                      {post.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "--"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                      >
                        Edit
                      </Link>
                      <form action={handleDelete.bind(null, post.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-loss hover:text-loss"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/admin/posts${page > 2 ? `?page=${page - 1}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}` : typeFilter !== "all" ? `?type=${typeFilter}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/posts?page=${page + 1}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
