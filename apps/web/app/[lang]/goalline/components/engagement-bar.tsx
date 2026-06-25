"use client";

import { useEffect, useState } from "react";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";

interface EngagementBarProps {
  cardId: string;
  lang?: Lang;
}

/**
 * Shows streak counter + social proof ("X people picked today").
 * Reads from existing APIs — no new endpoints needed.
 */
export function EngagementBar({ cardId, lang = "en" }: EngagementBarProps) {
  const S = getDailyLineDict(lang);
  const [streak, setStreak] = useState(0);
  const [totalPicks, setTotalPicks] = useState(0);
  const [overCount, setOverCount] = useState(0);
  const [underCount, setUnderCount] = useState(0);
  const [hasPicked, setHasPicked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const deviceId = localStorage.getItem("gl_device_id");

    // Fetch social proof (total picks + over/under split)
    fetch(`/api/goalline/card-stats?cardId=${cardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.totalPicks) setTotalPicks(data.totalPicks);
        if (data.overCount) setOverCount(data.overCount);
        if (data.underCount) setUnderCount(data.underCount);
      })
      .catch(() => {});

    // Fetch streak + check if user has picked this card
    if (deviceId) {
      fetch(`/api/goalline/my-picks?deviceId=${deviceId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.picks?.length) {
            setStreak(calculateStreak(data.picks));
            const myPick = data.picks.find(
              (p: { cardId?: string }) => p.cardId === cardId,
            );
            if (myPick) setHasPicked(true);
          }
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [cardId]);

  if (!loaded) return <div className="mb-4 h-5" />; // reserve height to prevent CLS
  if (streak === 0 && totalPicks === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
      {totalPicks > 0 && (
        <span>
          {"\uD83D\uDC65"} {S.PLAYERS_PICKED(totalPicks)}
        </span>
      )}
      {hasPicked && overCount + underCount > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-over">{"\uD83D\uDFE2"} {overCount} Over</span>
          <span>·</span>
          <span className="text-under">{"\uD83D\uDD35"} {underCount} Under</span>
        </span>
      )}
      {streak > 1 && (
        <span className="inline-flex items-center gap-1">
          <span className="text-brand">{"\uD83D\uDD25"}</span>
          {S.DAY_STREAK(streak)}
        </span>
      )}
    </div>
  );
}

/** Calculate consecutive-day pick streak ending today/yesterday. */
function calculateStreak(picks: { card?: { utcDate: string } | null }[]): number {
  const dates = picks
    .filter((p) => p.card?.utcDate)
    .map((p) => p.card!.utcDate)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .sort()
    .reverse(); // newest first

  if (dates.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
