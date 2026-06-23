"use client";

import { useState, useCallback } from "react";
import type { PickSide } from "@/lib/types";
import { S } from "@/lib/strings";

interface PickButtonsProps {
  cardId: string;
  goalLine: number;
  overOdds: number;
  underOdds: number;
  disabled: boolean;
}

type Phase = "idle" | "confirming" | "submitting" | "done" | "error";

export function PickButtons({
  cardId,
  goalLine,
  overOdds,
  underOdds,
  disabled,
}: PickButtonsProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingSide, setPendingSide] = useState<PickSide | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSelect = useCallback((side: PickSide) => {
    setPendingSide(side);
    setPhase("confirming");
    setErrorMsg("");
  }, []);

  const handleCancel = useCallback(() => {
    setPendingSide(null);
    setPhase("idle");
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingSide) return;
    setPhase("submitting");

    // Guest identity: use localStorage device-id (spec §7)
    let userId = localStorage.getItem("gl_device_id");
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("gl_device_id", userId);
    }

    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cardId, side: pendingSide }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setPhase("error");
        return;
      }
      setPhase("done");
      // Reload to show locked state from server
      window.location.reload();
    } catch {
      setErrorMsg("Network error. Try again.");
      setPhase("error");
    }
  }, [pendingSide, cardId]);

  const odds = pendingSide === "over" ? overOdds : underOdds;
  const sideLabel = pendingSide === "over" ? S.OVER : S.UNDER;

  // Confirmation modal overlay
  if (phase === "confirming" && pendingSide) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-card p-5 text-center">
          <h3 className="font-display text-lg font-bold text-ink">
            {S.CONFIRM_TITLE}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {S.CONFIRM_BODY(sideLabel, goalLine, odds)}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition hover:bg-card-hover"
            >
              {S.CANCEL_BTN}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-bg transition hover:opacity-90"
            >
              {S.CONFIRM_BTN}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting state
  if (phase === "submitting") {
    return (
      <div className="py-6 text-center text-sm text-muted">
        Locking your pick...
      </div>
    );
  }

  // Error state
  if (phase === "error") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-loss">{errorMsg}</p>
        <button
          onClick={() => setPhase("idle")}
          className="text-sm text-brand underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Default: Over / Under buttons
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => handleSelect("over")}
        disabled={disabled}
        className="rounded-xl border-2 border-over bg-over-dim px-5 py-4 text-center transition hover:bg-over/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="block font-display text-lg font-bold text-over">
          {S.OVER}
        </span>
        <span className="block text-sm text-muted">{overOdds.toFixed(2)}</span>
      </button>
      <button
        onClick={() => handleSelect("under")}
        disabled={disabled}
        className="rounded-xl border-2 border-under bg-under-dim px-5 py-4 text-center transition hover:bg-under/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="block font-display text-lg font-bold text-under">
          {S.UNDER}
        </span>
        <span className="block text-sm text-muted">
          {underOdds.toFixed(2)}
        </span>
      </button>
    </div>
  );
}
