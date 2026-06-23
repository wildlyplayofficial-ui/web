"use client";

import { useEffect, useState } from "react";

/** Live countdown that updates every minute. Displays "{prefix} Xh Ym". */
export function MatchCountdown({ kickoffUtc, prefix = "Kicks off in" }: { kickoffUtc: string; prefix?: string }) {
  const [label, setLabel] = useState(() => formatCountdown(kickoffUtc, prefix));

  useEffect(() => {
    const timer = setInterval(() => setLabel(formatCountdown(kickoffUtc, prefix)), 60_000);
    return () => clearInterval(timer);
  }, [kickoffUtc, prefix]);

  if (!label) return null;
  return <span className="text-xs text-muted">{label}</span>;
}

function formatCountdown(iso: string, prefix: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${prefix} ${h}h ${m}m`;
  return `${prefix} ${m}m`;
}
