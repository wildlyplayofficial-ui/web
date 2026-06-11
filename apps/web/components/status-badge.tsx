import type { BadgeKind } from "@/lib/format";
import type { Dict } from "@/lib/i18n";

const styles: Record<BadgeKind, string> = {
  upcoming: "bg-card text-muted border border-line",
  live: "bg-brand-dim text-brand border border-brand/30",
  won: "bg-brand-dim text-brand border border-brand/30",
  lost: "bg-loss-dim text-loss border border-loss/30",
  push: "bg-card text-muted border border-line",
  void: "bg-card text-muted border border-line line-through",
};

export function StatusBadge({ kind, dict }: { kind: BadgeKind; dict: Dict }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-xs font-semibold tracking-wide ${styles[kind]}`}
    >
      {kind === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
      )}
      {dict.badge[kind]}
    </span>
  );
}
