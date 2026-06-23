"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetUtc: string;
  label: string;
  onExpired?: () => void;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calcTimeLeft(targetUtc: string): TimeLeft {
  const diff = new Date(targetUtc).getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
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

export function Countdown({ targetUtc, label, onExpired }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(targetUtc),
  );

  useEffect(() => {
    if (timeLeft.expired) {
      onExpired?.();
      return;
    }
    const id = setInterval(() => {
      const next = calcTimeLeft(targetUtc);
      setTimeLeft(next);
      if (next.expired) {
        onExpired?.();
        clearInterval(id);
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [targetUtc, timeLeft.expired, onExpired]);

  if (timeLeft.expired) {
    return null;
  }

  return (
    <div className="text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums text-ink">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </p>
    </div>
  );
}
