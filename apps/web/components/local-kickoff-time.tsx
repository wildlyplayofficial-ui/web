"use client";

import { useEffect, useState } from "react";

interface LocalKickoffTimeProps {
  iso: string;
  /** Also show the kickoff date (local), not just the time. */
  showDate?: boolean;
  className?: string;
}

/** Shows kickoff time in the viewer's local timezone (auto-detected). */
export function LocalKickoffTime({ iso, showDate, className = "text-xs text-muted" }: LocalKickoffTimeProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;
    const fmt = new Intl.DateTimeFormat(undefined, {
      ...(showDate ? { month: "short" as const, day: "numeric" as const } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    setLabel(fmt.format(d));
  }, [iso, showDate]);

  // SSR fallback: show UTC, guard NaN
  if (!label) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    const datePrefix = showDate ? `${iso.slice(0, 10)} · ` : "";
    return <span className={className}>{datePrefix}{h}:{m} UTC</span>;
  }

  return <span className={className}>{label}</span>;
}
