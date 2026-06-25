"use client";

import { useState, useCallback } from "react";
import { publishCard, lockCard } from "@/lib/goalline/card-actions";
import { settleCardAction as settleCard, voidCard } from "@/lib/goalline/settle-actions";
import { S } from "@/lib/goalline/strings";
import type { DailyCard, CardMatch, CardStatus } from "@/lib/goalline/types";

interface AdminCardRowProps {
  card: DailyCard;
  matches: CardMatch[];
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

const MATCH_STATUS_LABEL: Record<string, string> = {
  scheduled: "",
  live: "LIVE",
  finished: "FT",
  postponed: "PPD",
  abandoned: "ABD",
};

export function AdminCardRow({ card, matches }: AdminCardRowProps) {
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

      {/* Matches */}
      {matches.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-line pt-3">
          {matches.map((m) => {
            const hasScore = m.status === "finished" || m.status === "live";
            const statusLabel = MATCH_STATUS_LABEL[m.status] ?? m.status;
            const kickoff = new Date(m.kickoff_time_utc).toLocaleTimeString("en-GB", {
              hour: "2-digit", minute: "2-digit", timeZone: "UTC",
            });
            return (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="text-ink">
                  {m.home_team} vs {m.away_team}
                </span>
                <span className="flex items-center gap-2 text-muted">
                  {hasScore && (
                    <span className="font-bold text-ink">
                      {m.home_score ?? 0}–{m.away_score ?? 0}
                    </span>
                  )}
                  {statusLabel && (
                    <span className={`text-[10px] font-bold uppercase ${
                      m.status === "live" ? "text-brand" :
                      m.status === "finished" ? "text-muted" :
                      "text-loss"
                    }`}>
                      {statusLabel}
                    </span>
                  )}
                  <span>{kickoff} UTC</span>
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-1 text-xs font-bold text-ink">
            <span>Total goals</span>
            <span>{matches.reduce((sum, m) => sum + (m.valid_goals ?? 0), 0)}</span>
          </div>
        </div>
      )}

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
