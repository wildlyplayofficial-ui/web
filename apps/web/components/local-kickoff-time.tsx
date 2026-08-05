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

  // SSR fallback (trước khi JS chạy, chưa biết múi giờ viewer): hiện giờ VN
  // (UTC+7) theo định dạng ngày kiểu Việt (21/8) — đây là thứ Google thấy
  // đầu tiên nên không để "UTC" hay ngày ISO lọt ra bản tiếng Việt.
  if (!label) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const vn = new Date(d.getTime() + 7 * 3600_000);
    const h = String(vn.getUTCHours()).padStart(2, "0");
    const m = String(vn.getUTCMinutes()).padStart(2, "0");
    const datePrefix = showDate ? `${vn.getUTCDate()}/${vn.getUTCMonth() + 1} · ` : "";
    return <span className={className}>{datePrefix}{h}:{m}</span>;
  }

  return <span className={className}>{label}</span>;
}
