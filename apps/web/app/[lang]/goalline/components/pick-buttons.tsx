"use client";

import { useState, useCallback, useEffect } from "react";
import type { PickSide } from "@/lib/goalline/types";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";

interface PickButtonsProps {
  cardId: string;
  goalLine: number;
  overOdds: number;
  underOdds: number;
  disabled: boolean;
  lang?: Lang;
}

interface ExistingPick {
  side: PickSide;
  odds_locked: number;
  stake_points: number;
}

const ANIMAL_EMOJI: Record<string, string> = {
  Penguin: "🐧", Hedgehog: "🦔", Otter: "🦦", Panda: "🐼", Koala: "🐨",
  Fox: "🦊", Owl: "🦉", Dolphin: "🐬", Tiger: "🐯", Bear: "🐻",
  Wolf: "🐺", Eagle: "🦅", Lion: "🦁", Rabbit: "🐰", Turtle: "🐢",
  Falcon: "🦅", Seal: "🦭", Lynx: "🐱", Raven: "🐦‍⬛", Jaguar: "🐆",
};

function animalEmoji(displayName: string): string {
  const animal = displayName.split(" ").pop() ?? "";
  return ANIMAL_EMOJI[animal] ?? "🐾";
}

type Phase = "loading" | "idle" | "confirming" | "submitting" | "done" | "error";

export function PickButtons({
  cardId,
  goalLine,
  overOdds,
  underOdds,
  disabled,
  lang = "en",
}: PickButtonsProps) {
  const S = getDailyLineDict(lang);
  const [phase, setPhase] = useState<Phase>("loading");
  const [pendingSide, setPendingSide] = useState<PickSide | null>(null);
  const [existingPick, setExistingPick] = useState<ExistingPick | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if user already picked on mount
  useEffect(() => {
    const deviceId = localStorage.getItem("gl_device_id");
    if (!deviceId) {
      setPhase("idle");
      return;
    }
    fetch(`/api/goalline/my-picks?deviceId=${deviceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.displayName) setDisplayName(data.displayName);
        const myPick = (data.picks ?? []).find(
          (p: { cardId?: string }) => p.cardId === cardId,
        );
        if (myPick) {
          setExistingPick({ side: myPick.side, odds_locked: myPick.oddsLocked, stake_points: myPick.stakePoints });
          setPendingSide(myPick.side);
          setPhase("done");
        } else {
          setPhase("idle");
        }
      })
      .catch(() => setPhase("idle"));
  }, [cardId]);

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

    let deviceId = localStorage.getItem("gl_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("gl_device_id", deviceId);
    }

    try {
      const res = await fetch("/api/goalline/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, cardId, side: pendingSide }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setPhase("error");
        return;
      }
      setExistingPick(data.pick);
      setPhase("done");
    } catch {
      setErrorMsg("Network error. Try again.");
      setPhase("error");
    }
  }, [pendingSide, cardId]);

  const lockedOdds = pendingSide === "over" ? overOdds : underOdds;
  const sideLabel = pendingSide === "over" ? S.OVER : S.UNDER;

  // Loading
  if (phase === "loading") {
    return <div className="py-6 text-center text-sm text-muted">Loading...</div>;
  }

  // Already picked — locked state
  if (phase === "done" && (existingPick || pendingSide)) {
    const side = existingPick?.side ?? pendingSide;
    const odds = existingPick?.odds_locked ?? lockedOdds;
    return (
      <div className="rounded-xl border-2 border-brand bg-brand-dim p-5 text-center">
        {displayName && (
          <p className="mb-2 text-sm font-medium text-muted">
            {animalEmoji(displayName)} {displayName}
          </p>
        )}
        <p className="font-display text-lg font-bold text-brand">{S.PICK_LOCKED_TITLE}</p>
        <p className="mt-2 text-sm text-ink">
          {S.YOU_PICKED(side === "over" ? S.OVER : S.UNDER, goalLine, odds)}
        </p>
        <p className="mt-1 text-xs text-muted">{S.PTS_STAKED} · {S.POTENTIAL_RETURN(Math.round(100 * odds))}</p>
      </div>
    );
  }

  // Confirmation modal
  if (phase === "confirming" && pendingSide) {
    const odds = pendingSide === "over" ? overOdds : underOdds;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-card p-5 text-center">
          <h3 className="font-display text-lg font-bold text-ink">{S.CONFIRM_TITLE}</h3>
          <p className="mt-2 text-sm text-muted">{S.CONFIRM_BODY(sideLabel, goalLine, odds)}</p>
          <p className="mt-1 text-xs text-loss">Cannot be changed after locking.</p>
          <div className="mt-5 flex gap-3">
            <button onClick={handleCancel} className="flex-1 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition hover:bg-card-hover">
              {S.CANCEL_BTN}
            </button>
            <button onClick={handleConfirm} className="flex-1 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-bg transition hover:opacity-90">
              {S.CONFIRM_BTN}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting
  if (phase === "submitting") {
    return <div className="py-6 text-center text-sm text-muted">Locking your pick...</div>;
  }

  // Error
  if (phase === "error") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-loss">{errorMsg}</p>
        <button onClick={() => setPhase("idle")} className="text-sm text-brand underline">Try again</button>
      </div>
    );
  }

  // Default: Over / Under buttons
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => handleSelect("over")}
        disabled={disabled}
        className="min-w-0 rounded-xl border-2 border-over bg-over-dim px-3 py-5 text-center transition hover:bg-over/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="block font-display text-lg font-bold text-over">&#9650; {S.OVER}</span>
        <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">{overOdds.toFixed(2)}</span>
      </button>
      <button
        onClick={() => handleSelect("under")}
        disabled={disabled}
        className="min-w-0 rounded-xl border-2 border-under bg-under-dim px-3 py-5 text-center transition hover:bg-under/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="block font-display text-lg font-bold text-under">&#9660; {S.UNDER}</span>
        <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">{underOdds.toFixed(2)}</span>
      </button>
    </div>
  );
}
