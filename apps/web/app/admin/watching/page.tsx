import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getWatching } from "@/lib/admin-data";
import { unwatchAction } from "@/lib/admin-actions";
import { formatKickoff } from "@/lib/format";
import type { WatchingRow } from "@/lib/types";

async function handleUnwatch(watchingId: string): Promise<void> {
  "use server";
  await unwatchAction(watchingId);
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-brand-dim text-brand",
  expired: "bg-card-hover text-muted",
  picked: "bg-indigo-soft/20 text-indigo-soft",
};

function StatusBadge({ status }: { status: WatchingRow["status"] }) {
  const style = STATUS_STYLES[status] ?? "bg-card-hover text-muted";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminWatchingPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const { items: watching, totalPages, total } = await getWatching(page);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Watching <span className="text-sm font-normal text-muted">({total})</span></h1>
        <Link
          href="/admin/watching/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          New Watching
        </Link>
      </div>

      {watching.length === 0 ? (
        <p className="text-muted">No watching items yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">League</th>
                <th className="px-3 py-2">Kickoff</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {watching.map((w) => (
                <tr key={w.id} className="border-b border-line/50">
                  <td className="px-3 py-3">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {w.home_team} vs {w.away_team}
                  </td>
                  <td className="px-3 py-3 text-muted">{w.league}</td>
                  <td className="px-3 py-3 text-muted">
                    {formatKickoff(w.kickoff_utc, "en")}
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 text-muted">
                    {w.note ?? "--"}
                  </td>
                  <td className="px-3 py-3">
                    {w.status === "active" && (
                      <form action={handleUnwatch.bind(null, w.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-loss hover:text-loss"
                        >
                          Unwatch
                        </button>
                      </form>
                    )}
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
              href={`/admin/watching${page > 2 ? `?page=${page - 1}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/watching?page=${page + 1}`}
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
