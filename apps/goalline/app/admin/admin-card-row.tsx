"use client";

import { useState, useCallback } from "react";
import { publishCard, lockCard, settleCard, voidCard } from "@/lib/card-actions";
import { S } from "@/lib/strings";
import type { DailyCard, CardStatus } from "@/lib/types";

interface AdminCardRowProps {
  card: DailyCard;
}

const STATUS_COLORS: Record<CardStatus, string> = {
  draft: "bg-card-hover text-muted",
  scheduled: "bg-under-dim text-under",
  open: "bg-brand-dim text-brand",
  locked: "bg-card-hover text-ink",
  live: "bg-brand-dim text-brand",
  settled: "bg-card-hover text-muted",
  voided: "bg-loss-dim text-loss",
};

/** Actions available per status. */
function availableActions(status: CardStatus): string[] {
  switch (status) {
    case "draft":
    case "scheduled":
      return ["publish"];
    case "open":
      return ["lock", "void"];
    case "locked":
    case "live":
      return ["settle", "void"];
    default:
      return [];
  }
}

export function AdminCardRow({ card }: AdminCardRowProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const runAction = useCallback(
    async (action: string) => {
      setLoading(true);
      setFeedback("");

      let result: { error?: string; cardId?: string };
      switch (action) {
        case "publish":
          result = await publishCard(card.id);
          break;
        case "lock":
          result = await lockCard(card.id);
          break;
        case "settle":
          result = await settleCard(card.id);
          break;
        case "void":
          result = await voidCard(card.id, "Admin voided");
          break;
        default:
          result = { error: "Unknown action" };
      }

      if (result.error) {
        setFeedback(result.error);
      } else {
        setFeedback(`${action} OK`);
        // Reload to reflect new status
        window.location.reload();
      }
      setLoading(false);
    },
    [card.id],
  );

  const actions = availableActions(card.status);
  const statusColor = STATUS_COLORS[card.status] ?? "bg-card-hover text-muted";

  const actionLabels: Record<string, string> = {
    publish: S.PUBLISH,
    lock: S.LOCK,
    settle: S.SETTLE,
    void: S.VOID,
  };

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              #{card.card_number}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor}`}
            >
              {card.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {card.utc_date} &middot; Line {card.goal_line} &middot;{" "}
            {card.over_odds}/{card.under_odds}
          </p>
          {card.settlement_result && (
            <p className="mt-1 text-xs text-brand">
              Result: {card.settlement_result}
            </p>
          )}
          {card.void_reason && (
            <p className="mt-1 text-xs text-loss">
              Voided: {card.void_reason}
            </p>
          )}
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action) => (
              <button
                key={action}
                onClick={() => runAction(action)}
                disabled={loading}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  action === "void"
                    ? "border border-loss text-loss hover:bg-loss-dim"
                    : "border border-brand text-brand hover:bg-brand-dim"
                }`}
              >
                {actionLabels[action] ?? action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <p
          className={`mt-2 text-xs ${
            feedback.includes("OK") ? "text-brand" : "text-loss"
          }`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
