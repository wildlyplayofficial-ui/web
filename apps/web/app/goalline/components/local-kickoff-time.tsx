"use client";

import { useState, useEffect } from "react";

interface LocalKickoffTimeProps {
  utc: string;
}

/** Renders kickoff time in the visitor's local timezone (client-only to avoid hydration mismatch). */
export function LocalKickoffTime({ utc }: LocalKickoffTimeProps) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(
      new Date(utc).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [utc]);

  if (!formatted) return <span className="text-muted">--:--</span>;
  return <>{formatted}</>;
}
