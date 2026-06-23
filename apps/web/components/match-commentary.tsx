"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";

interface MatchEvent {
  time: string;
  type: string;
  emoji: string;
  player: string;
  info: string;
  side: "home" | "away";
}

interface PickContext {
  id: string;
  selection: string;
  market: string;
  line: number | null;
  odds_publish: number;
  status: string;
}

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface MatchCommentaryProps {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  pick: PickContext;
  lang: Lang;
}

const POLL_INTERVAL = 30_000;

function teamsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  if (al.includes(bl) || bl.includes(al)) return true;
  const af = al.split(/\s+/)[0], bf = bl.split(/\s+/)[0];
  return af.length >= 4 && (af.startsWith(bf) || bf.startsWith(af));
}

/** Generate odds-impact note for a specific event based on the pick and running score. */
function eventImpact(
  event: MatchEvent,
  pick: PickContext,
  runningHome: number,
  runningAway: number,
): string | null {
  if (event.type !== "GOAL") return null;
  const total = runningHome + runningAway;
  const line = pick.line;

  if (pick.market === "ou" && line !== null) {
    const margin = total - line;
    if (margin > 0) return `→ Over ${line} covered (${total} goals)`;
    if (margin === 0) return `→ On the line — 1 more wins Over ${line}`;
    const left = Math.ceil(line) - total;
    return `→ Over needs ${left} more · Under ${line} holds`;
  }

  if (pick.market === "ah" && line !== null) {
    const sel = pick.selection.toLowerCase();
    const diff = sel.includes("home") || sel.includes(pick.selection.split(" ")[0]?.toLowerCase() ?? "")
      ? runningHome - runningAway
      : runningAway - runningHome;
    return `→ Pick side ${diff > 0 ? "leading" : diff === 0 ? "level" : "trailing"} (${runningHome}-${runningAway})`;
  }

  return `→ ${total} goals total`;
}

/** Generate overall odds-impact banner. */
function overallImpact(
  pick: PickContext,
  homeGoals: number,
  awayGoals: number,
): string | null {
  const total = homeGoals + awayGoals;
  const line = pick.line;

  if (pick.market === "ou" && line !== null) {
    const margin = total - line;
    if (margin > 0) return `Over ${line} covered — ${total} goals`;
    if (margin === 0) return `On the line — next goal decides`;
    return `Under ${line} holding — ${Math.ceil(line) - total} more for Over`;
  }
  return null;
}

/**
 * Live match commentary — events feed + pick odds context.
 * Each event links to the Curator's pick analysis.
 */
export function MatchCommentary({
  fixtureId,
  homeTeam,
  awayTeam,
  pick,
  lang,
}: MatchCommentaryProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        // Fetch live matches to find livescore ID by team name (provider IDs differ)
        const matchRes = await fetch("/api/matches?live=1");
        if (!matchRes.ok) return;
        const matchData = await matchRes.json();
        const liveMatches = (matchData.matches ?? []) as LiveMatch[];

        // Find matching match by team names (fallback when fixture_id is odds-api ID)
        const liveMatch = liveMatches.find(
          (m) =>
            teamsMatch(m.homeTeam, homeTeam) && teamsMatch(m.awayTeam, awayTeam),
        );

        if (liveMatch && !cancelled) {
          setHomeGoals(liveMatch.homeScore ?? 0);
          setAwayGoals(liveMatch.awayScore ?? 0);

          // Fetch events using livescore ID (from /api/matches)
          const evRes = await fetch(`/api/events/${liveMatch.id}`);
          if (evRes.ok) {
            const data = (await evRes.json()) as MatchEvent[];
            if (!cancelled) {
              setEvents(data);
              setLoaded(true);
            }
          }
        }
      } catch { /* degrade silently */ }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(timer); };
  }, [fixtureId]);

  if (!loaded || events.length === 0) return null;

  const sorted = [...events].sort((a, b) => {
    const ta = parseInt(a.time, 10) || 0;
    const tb = parseInt(b.time, 10) || 0;
    return tb - ta;
  });

  const teamName = (side: "home" | "away") => (side === "home" ? homeTeam : awayTeam);
  const impact = overallImpact(pick, homeGoals, awayGoals);
  const pickUrl = `/play/${pick.id}`;

  // Calculate running score for per-event impact
  const chronological = [...events].sort((a, b) => parseInt(a.time) - parseInt(b.time));
  let runH = 0, runA = 0;
  const runningScores = new Map<string, { h: number; a: number }>();
  for (const ev of chronological) {
    if (ev.type === "GOAL") {
      if (ev.side === "home") runH++; else runA++;
    }
    runningScores.set(`${ev.time}-${ev.player}`, { h: runH, a: runA });
  }

  return (
    <section className="mt-8 rounded-card border border-line bg-card p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold">Commentary</h2>
        <Link
          href={pickUrl}
          className="text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          View pick →
        </Link>
      </div>

      {/* Odds impact banner */}
      {impact && pick.status === "published" && (
        <div className="mb-4 rounded-lg border border-brand/20 bg-brand-dim px-4 py-3 text-sm">
          <span className="font-semibold text-brand">Pick status</span>
          <span className="ml-2 text-ink">{impact}</span>
          <span className="ml-2 text-muted">@ {pick.odds_publish.toFixed(2)}</span>
        </div>
      )}

      {/* Events feed with per-event odds impact */}
      <div className="space-y-3">
        {sorted.map((ev, i) => {
          const scores = runningScores.get(`${ev.time}-${ev.player}`);
          const evImpact = scores ? eventImpact(ev, pick, scores.h, scores.a) : null;

          return (
            <div key={`${ev.time}-${ev.player}-${i}`}>
              <div className="flex items-start gap-3 text-sm">
                <span className="w-8 shrink-0 text-right font-display font-semibold tabular-nums text-muted">
                  {ev.time}&apos;
                </span>
                <span className="shrink-0">{ev.emoji}</span>
                <span className="text-ink">
                  <strong>{ev.player}</strong>
                  {ev.info && ev.type === "GOAL" && (
                    <span className="text-muted"> (assist: {ev.info})</span>
                  )}
                  {ev.info && ev.type === "SUBSTITUTION" && (
                    <span className="text-muted"> ↔ {ev.info}</span>
                  )}
                  <span className="ml-1.5 text-muted">— {teamName(ev.side)}</span>
                </span>
              </div>
              {evImpact && (
                <p className="ml-11 mt-0.5 text-xs font-medium text-brand">{evImpact}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
