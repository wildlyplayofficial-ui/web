import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getBoothShadow } from "@/lib/admin-data";
import type { BoothShadowRow } from "@/lib/admin-data";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function VoiceBadge({ who }: { who: string }) {
  const isSonny = who === "sonny";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isSonny ? "text-brand" : "text-loss"
      }`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          isSonny ? "bg-brand" : "bg-loss"
        }`}
      />
      {isSonny ? "Sonny" : "Cole"}
    </span>
  );
}

function ShadowCard({ row }: { row: BoothShadowRow }) {
  const detail = row.event_detail as Record<string, unknown>;
  const score = detail.score as { home: number; away: number } | undefined;

  return (
    <div
      className={`rounded-lg border p-4 ${
        row.lint_passed ? "border-line bg-card" : "border-loss/30 bg-loss/5"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-card-hover px-2 py-0.5 text-xs font-medium text-ink">
            {row.event_minute}&apos; {row.event_type.toUpperCase()}
          </span>
          {score && (
            <span className="text-xs text-muted">
              {score.home}-{score.away}
            </span>
          )}
          {typeof detail.player === "string" && (
            <span className="text-xs text-muted">{detail.player}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <VoiceBadge who={row.lead_voice} />
          {!row.lint_passed && (
            <span className="rounded bg-loss/20 px-1.5 py-0.5 text-[10px] font-bold text-loss">
              LINT FAIL
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {row.lines_en.map((line, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <VoiceBadge who={line.who} />
            <span className="text-ink">{line.text}</span>
          </div>
        ))}
      </div>

      {row.lint_flags && row.lint_flags.length > 0 && (
        <div className="mt-2 text-xs text-loss">
          Flags: {row.lint_flags.join("; ")}
        </div>
      )}

      <div className="mt-2 text-[10px] text-muted">
        {new Date(row.created_at).toLocaleString()} | {row.model}
      </div>
    </div>
  );
}

export default async function BoothShadowPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const pickId = sp.pick ? String(sp.pick) : undefined;
  const { items, totalPages, total } = await getBoothShadow(pickId, page);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">
          The Booth — Shadow{" "}
          <span className="text-sm font-normal text-muted">({total})</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">
          No shadow output yet. Waiting for a live match with a pick.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <ShadowCard key={row.id} row={row} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/admin/booth${page > 2 ? `?page=${page - 1}` : ""}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              &larr; Prev
            </Link>
          )}
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/booth?page=${page + 1}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              Next &rarr;
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
