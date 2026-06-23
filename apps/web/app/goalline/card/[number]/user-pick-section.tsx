"use client";

import { useEffect, useState } from "react";
import { S } from "@/lib/goalline/strings";
import type { DailyCard, PickSide, PickStatus } from "@/lib/goalline/types";

interface Pick {
  side: PickSide;
  oddsLocked: number;
  stakePoints: number;
  status: PickStatus;
  pointsAwarded: number | null;
}

interface UserPickSectionProps {
  cardId: string;
  card: DailyCard;
}

export function UserPickSection({ cardId, card }: UserPickSectionProps) {
  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deviceId = localStorage.getItem("gl_device_id");
    if (!deviceId) {
      setLoading(false);
      return;
    }

    fetch(`/api/goalline/my-picks?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.picks ?? []).find(
          (p: { card: { cardNumber: number } | null }) =>
            p.card?.cardNumber === card.card_number,
        );
        if (match) {
          setPick({
            side: match.side as PickSide,
            oddsLocked: match.oddsLocked,
            stakePoints: match.stakePoints,
            status: match.status as PickStatus,
            pointsAwarded: match.pointsAwarded,
          });
        }
      })
      .catch(() => {/* silently skip */})
      .finally(() => setLoading(false));
  }, [cardId, card.card_number]);

  if (loading || !pick) return null;

  const sideLabel = pick.side === "over" ? S.OVER : S.UNDER;
  const sideColor = pick.side === "over" ? "text-over" : "text-under";
  const isSettled = pick.status === "won" || pick.status === "lost";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isSettled
          ? pick.status === "won"
            ? "border-brand bg-brand-dim"
            : "border-loss bg-loss-dim"
          : "border-line bg-card"
      }`}
    >
      <p className="text-xs font-medium tracking-wider text-muted uppercase mb-3">
        {S.YOUR_PICK}
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className={`font-display text-2xl font-bold ${sideColor}`}>
            {sideLabel} {card.goal_line}
          </p>
          <p className="mt-1 text-sm text-muted">
            {S.ODDS_LOCKED}: <span className="text-ink">{pick.oddsLocked.toFixed(2)}</span>
          </p>
        </div>

        {isSettled && (
          <div className="text-right">
            <p
              className={`font-display text-xl font-bold ${
                pick.status === "won" ? "text-brand" : "text-loss"
              }`}
            >
              {pick.status === "won" ? S.WON : S.LOST}
            </p>
            {pick.pointsAwarded !== null && (
              <p className="mt-0.5 text-sm text-muted">
                {pick.pointsAwarded > 0 ? `+${pick.pointsAwarded}` : pick.pointsAwarded} pts
              </p>
            )}
          </div>
        )}

        {pick.status === "locked" && (
          <p className="text-sm font-semibold text-muted">Locked</p>
        )}
      </div>
    </div>
  );
}
