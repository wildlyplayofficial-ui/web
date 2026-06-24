import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminWatching } from "@/lib/admin-data";
import { formatKickoff } from "@/lib/format";
import { TranslatePanel } from "./translate-panel";

type Props = { params: Promise<{ id: string }> };

export default async function WatchingDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const w = await getAdminWatching(id);
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-bold">
        {w.home_team} vs {w.away_team}
      </h1>

      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">League:</span>{" "}
              <span className="text-ink">{w.league}</span>
            </div>
            <div>
              <span className="text-muted">Kickoff:</span>{" "}
              <span className="text-ink">{formatKickoff(w.kickoff_utc, "en")}</span>
            </div>
            <div>
              <span className="text-muted">Status:</span>{" "}
              <span className="text-ink">{w.status}</span>
            </div>
            <div>
              <span className="text-muted">Created:</span>{" "}
              <span className="text-ink">
                {new Date(w.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            Curator Note (EN)
          </h2>
          <p className="whitespace-pre-wrap text-sm text-ink">
            {w.note || "(no note)"}
          </p>
        </div>

        {w.note && (
          <TranslatePanel
            watchingId={w.id}
            note={w.note}
            translations={w.note_translations}
            draft={w.note_translations_draft}
          />
        )}
      </div>
    </div>
  );
}
