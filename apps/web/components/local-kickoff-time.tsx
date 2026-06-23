"use client";

import { useEffect, useState } from "react";

/** Shows kickoff time in the viewer's local timezone (auto-detected). */
export function LocalKickoffTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    setLabel(fmt.format(d));
  }, [iso]);

  // SSR fallback: show UTC, guard NaN
  if (!label) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return <span className="text-xs text-muted">{h}:{m} UTC</span>;
  }

  return <span className="text-xs text-muted">{label}</span>;
}
