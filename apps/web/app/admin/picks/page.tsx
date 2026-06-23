import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getPicks } from "@/lib/admin-data";
import { voidPickAction } from "@/lib/admin-actions";
import { formatKickoff, formatOdds, formatUnits, badgeFor } from "@/lib/format";
import type { Pick } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-brand-dim text-brand",
  live: "bg-indigo-soft/20 text-indigo-soft",
  won: "bg-brand-dim text-brand",
  lost: "bg-loss-dim text-loss",
  push: "bg-card-hover text-muted",
  void: "bg-card-hover text-muted",
};

function StatusBadge({ pick }: { pick: Pick }) {
  const badge = badgeFor(pick);
  const style = STATUS_STYLES[badge] ?? "bg-card-hover text-muted";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
      {badge}
    </span>
  );
}

async function handleVoid(pickId: string): Promise<void> {
  "use server";
  await voidPickAction(pickId);
}

function PickActions({ pick }: { pick: Pick }) {
  const now = new Date();
  const kickoff = new Date(pick.kickoff_utc);
  const isPublished = pick.status === "published";

  if (!isPublished) return null;

  const canVoid = kickoff > now;
  const canSettle = kickoff <= now;

  return (
    <div className="flex gap-2">
      {canVoid && (
        <form action={handleVoid.bind(null, pick.id)}>
          <button
            type="submit"
            className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-loss hover:text-loss"
          >
            Void
          </button>
        </form>
      )}
      {canSettle && (
        <Link
          href={`/admin/picks/settle/${pick.id}`}
          className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
        >
          Settle
        </Link>
      )}
    </div>
  );
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPicksPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const { items: picks, totalPages, total } = await getPicks(page);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Picks <span className="text-sm font-normal text-muted">({total})</span></h1>
        <Link
          href="/admin/picks/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          New Pick
        </Link>
      </div>

      {picks.length === 0 ? (
        <p className="text-muted">No picks yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Selection</th>
                <th className="px-3 py-2">Odds</th>
                <th className="px-3 py-2">Stake</th>
                <th className="px-3 py-2">P/L</th>
                <th className="px-3 py-2">Kickoff</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((pick) => (
                <tr key={pick.id} className="border-b border-line/50">
                  <td className="px-3 py-3">
                    <StatusBadge pick={pick} />
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {pick.home_team} vs {pick.away_team}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {pick.selection}
                    {pick.line != null && ` (${pick.line > 0 ? "+" : ""}${pick.line})`}
                  </td>
                  <td className="px-3 py-3">{formatOdds(pick.odds_publish)}</td>
                  <td className="px-3 py-3">{pick.stake_units}u</td>
                  <td className="px-3 py-3">
                    {pick.units_pl != null ? (
                      <span className={pick.units_pl >= 0 ? "text-brand" : "text-loss"}>
                        {formatUnits(pick.units_pl)}
                      </span>
                    ) : (
                      <span className="text-muted">--</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {formatKickoff(pick.kickoff_utc, "en")}
                  </td>
                  <td className="px-3 py-3">
                    <PickActions pick={pick} />
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
              href={`/admin/picks${page > 2 ? `?page=${page - 1}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/picks?page=${page + 1}`}
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
