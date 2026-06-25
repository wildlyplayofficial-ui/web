"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** Fires a GA4 event on mount — drop into any page as a view tracker. */
export function TrackPageView({ event, params }: { event: string; params?: Record<string, string> }) {
  useEffect(() => { trackEvent(event, params); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Wraps children in a clickable span that fires a GA4 event. */
export function TrackClick({
  event,
  params,
  children,
}: {
  event: string;
  params?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <span onClick={() => trackEvent(event, params)}>
      {children}
    </span>
  );
}
