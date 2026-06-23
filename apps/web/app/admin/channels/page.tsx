import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getChannelLog } from "@/lib/admin-data";

const CHANNEL_LABELS: Record<string, string> = {
  telegram: "TG",
  facebook: "FB",
  web: "Web",
  x: "X",
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className="inline-block rounded-md bg-card-hover px-2 py-0.5 text-xs font-medium text-muted">
      {CHANNEL_LABELS[channel] ?? channel}
    </span>
  );
}

function OkBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-block rounded-md bg-brand-dim px-2 py-0.5 text-xs font-medium text-brand">
      ok
    </span>
  ) : (
    <span className="inline-block rounded-md bg-loss-dim px-2 py-0.5 text-xs font-medium text-loss">
      fail
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d) + " UTC";
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminChannelsPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const { items: logs, totalPages, total } = await getChannelLog(page);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Channel Log</h1>
        <span className="text-sm text-muted">{total} entries</span>
      </div>

      {logs.length === 0 ? (
        <p className="text-muted">No channel log entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Pick</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line/50">
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    {formatTimestamp(log.posted_at)}
                  </td>
                  <td className="px-3 py-3">
                    <ChannelBadge channel={log.channel} />
                  </td>
                  <td className="px-3 py-3">
                    <OkBadge ok={log.ok} />
                  </td>
                  <td className="px-3 py-3">
                    {log.pick_id ? (
                      <Link
                        href="/admin/picks"
                        className="text-brand transition-colors hover:underline"
                      >
                        {log.pick_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-muted">--</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 text-muted">
                    {log.detail || "--"}
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
              href={`/admin/channels${page > 2 ? `?page=${page - 1}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/channels?page=${page + 1}`}
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
