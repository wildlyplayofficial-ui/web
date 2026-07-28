import type { Dict } from "@/lib/i18n";
import type { Confidence } from "@/lib/types";

/** D1 (§9): pre-registered confidence display — neutral pill, same for Curator and Scout. */
export function ConfidenceBadge({ level, dict }: { level: Confidence; dict: Dict }) {
  const labels: Record<Confidence, string> = {
    low: dict.pick.confLow,
    medium: dict.pick.confMedium,
    high: dict.pick.confHigh,
  };
  // DB column is unconstrained text — render nothing on unexpected values.
  const label = labels[level];
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-card px-2.5 py-0.5 font-display text-xs font-semibold tracking-wide text-muted">
      {dict.pick.confidence}: <strong className="ml-1 text-ink">{label}</strong>
    </span>
  );
}
