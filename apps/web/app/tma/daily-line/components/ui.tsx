"use client";

import { useEffect, useState } from "react";
import { getDailyLineDict } from "@/lib/goalline/strings";

/* ── Countdown ─────────────────────────────────────────────────────────── */

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calcTimeLeft(targetUtc: string): TimeLeft {
  const diff = new Date(targetUtc).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    expired: false,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function TmaCountdown({
  targetUtc,
  label,
}: {
  targetUtc: string;
  label: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(targetUtc),
  );

  useEffect(() => {
    if (timeLeft.expired) return;
    const id = setInterval(() => {
      const next = calcTimeLeft(targetUtc);
      setTimeLeft(next);
      if (next.expired) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [targetUtc, timeLeft.expired]);

  if (timeLeft.expired) return null;

  return (
    <div className="text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums text-ink">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </p>
    </div>
  );
}

/* ── Share Button ──────────────────────────────────────────────────────── */

export function ShareButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="text-center">
      <button
        onClick={onClick}
        className="inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-bg transition-colors hover:bg-brand-hover active:bg-brand-pressed"
        style={{ minHeight: 44 }}
      >
        {label}
      </button>
    </div>
  );
}

/* ── Bottom Nav ────────────────────────────────────────────────────────── */

export function TmaBottomNav({
  groupId,
  displayName,
  onShare,
  isGameMode,
}: {
  groupId: string | null;
  displayName: string | null;
  onShare?: () => void;
  isGameMode?: boolean;
}) {
  const openWebLeaderboard = () => {
    const webapp = window.Telegram?.WebApp;
    const url = "https://www.wildlyplay.com/en/goalline/leaderboard";
    if (webapp?.openLink) {
      webapp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <div className="text-xs text-muted truncate max-w-[140px]">
          {displayName && <span>{displayName}</span>}
        </div>
        <div className="flex items-center gap-3">
          {onShare && (
            <button
              onClick={onShare}
              className="rounded-md bg-[#2AABEE]/10 px-3 py-2 text-xs font-medium text-[#2AABEE] transition hover:bg-[#2AABEE]/20"
            >
              Share
            </button>
          )}
          {groupId ? (
            <a
              href={`/tma/daily-line/group${typeof window !== "undefined" ? window.location.search : ""}`}
              className="rounded-md bg-card-hover px-3 py-2 text-xs font-medium text-ink transition hover:bg-line"
            >
              Group Board
            </a>
          ) : isGameMode ? (
            <span className="text-[10px] text-muted">
              Scores on game card
            </span>
          ) : (
            <button
              onClick={openWebLeaderboard}
              className="rounded-md bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition hover:bg-brand/20"
            >
              Leaderboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Engagement Bar ────────────────────────────────────────────────────── */

export function TmaEngagementBar({ cardId }: { cardId: string }) {
  const S = getDailyLineDict("en");
  const [totalPicks, setTotalPicks] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/goalline/card-stats?cardId=${cardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.totalPicks) setTotalPicks(data.totalPicks);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [cardId]);

  if (!loaded) return <div className="mb-4 h-5" />;
  if (totalPicks === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-center gap-3 text-xs text-muted">
      <span>{S.PLAYERS_PICKED(totalPicks)}</span>
    </div>
  );
}

/* ── How It Works ──────────────────────────────────────────────────────── */

export function TmaHowItWorks() {
  const S = getDailyLineDict("en");
  const steps = [
    { num: "1", title: S.STEP_1_TITLE, desc: S.STEP_1_DESC, icon: "\u26BD" },
    { num: "2", title: S.STEP_2_TITLE, desc: S.STEP_2_DESC, icon: "\u{1F3AF}" },
    { num: "3", title: S.STEP_3_TITLE, desc: S.STEP_3_DESC, icon: "\u{1F3C6}" },
  ];
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem("gl_how_dismissed") === "1");
  }, []);

  if (dismissed === null) return <div className="mb-6 h-[200px] sm:h-[120px]" />;

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("gl_how_dismissed");
          setDismissed(false);
        }}
        className="mb-4 text-xs text-muted hover:text-brand transition-colors"
      >
        {S.HOW_IT_WORKS_TITLE} &darr;
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-ink">
          {S.HOW_IT_WORKS_TITLE}
        </h3>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("gl_how_dismissed", "1");
            setDismissed(true);
          }}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          {S.GOT_IT} &times;
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.num}>
            <div className="text-2xl">{step.icon}</div>
            <p className="mt-1 font-display text-xs font-bold text-ink">
              {step.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
