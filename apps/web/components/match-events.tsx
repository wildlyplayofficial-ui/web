"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";

interface MatchEvent {
  time: string;
  type: string;
  emoji: string;
  player: string;
  info: string;
  side: "home" | "away";
}

interface MatchEventsProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  lang: Lang;
}

const POLL_INTERVAL = 30_000;

/** Live match events feed — goals, cards, substitutions. Polls every 30s. */
export function MatchEvents({ matchId, homeTeam, awayTeam, lang }: MatchEventsProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dict = getDict(lang);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch(`/api/events/${matchId}`);
        if (!res.ok) return;
        const data = (await res.json()) as MatchEvent[];
        if (!cancelled) {
          setEvents(data);
          setLoaded(true);
        }
      } catch {
        // Silently degrade — section stays hidden until data arrives.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matchId]);

  if (!loaded || events.length === 0) return null;

  // Sort by time descending (newest first).
  const sorted = [...events].sort((a, b) => {
    const ta = parseInt(a.time, 10) || 0;
    const tb = parseInt(b.time, 10) || 0;
    return tb - ta;
  });

  const teamName = (side: "home" | "away") => (side === "home" ? homeTeam : awayTeam);

  return (
    <section className="mt-8 rounded-card border border-line bg-card p-6">
      <h2 className="font-display text-lg font-bold">{dict.events.title}</h2>
      <div className="mt-3 space-y-2">
        {sorted.map((ev, i) => (
          <div key={`${ev.time}-${ev.player}-${i}`} className="flex items-start gap-3 text-sm">
            <span className="w-8 shrink-0 text-right font-display font-semibold tabular-nums text-muted">
              {ev.time}&apos;
            </span>
            <span className="shrink-0">{ev.emoji}</span>
            <span className="text-ink">
              <strong>{ev.player}</strong>
              {ev.info && ev.type === "GOAL" && (
                <span className="text-muted"> ({ev.info})</span>
              )}
              {ev.info && ev.type === "SUBSTITUTION" && (
                <span className="text-muted"> ↔ {ev.info}</span>
              )}
              <span className="ml-1.5 text-muted">— {teamName(ev.side)}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
