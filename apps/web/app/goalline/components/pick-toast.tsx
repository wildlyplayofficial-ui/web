"use client";

import { useEffect, useRef, useState } from "react";

interface PickToastProps {
  cardId: string;
}

interface RecentPick {
  id: string;
  side: string;
  name: string;
  at: string;
}

const ANIMAL_EMOJI: Record<string, string> = {
  Penguin: "\uD83D\uDC27", Hedgehog: "\uD83E\uDD94", Otter: "\uD83E\uDDA6",
  Panda: "\uD83D\uDC3C", Koala: "\uD83D\uDC28", Fox: "\uD83E\uDD8A",
  Owl: "\uD83E\uDD89", Dolphin: "\uD83D\uDC2C", Tiger: "\uD83D\uDC2F",
  Bear: "\uD83D\uDC3B", Wolf: "\uD83D\uDC3A", Eagle: "\uD83E\uDD85",
  Lion: "\uD83E\uDD81", Rabbit: "\uD83D\uDC30", Turtle: "\uD83D\uDC22",
};

function getEmoji(name: string): string {
  const animal = name.split(" ").pop() ?? "";
  return ANIMAL_EMOJI[animal] ?? "\uD83D\uDC3E";
}

/** Live toast notifications when new picks come in. Polls every 20s. */
export function PickToast({ cardId }: PickToastProps) {
  const [toasts, setToasts] = useState<RecentPick[]>([]);
  const seenIds = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/goalline/recent-picks?cardId=${cardId}`);
        const data = await res.json();
        const picks: RecentPick[] = data.picks ?? [];

        if (!initialized.current) {
          // First load — seed seen IDs, don't show toasts
          picks.forEach((p) => seenIds.current.add(p.id));
          initialized.current = true;
          return;
        }

        const newPicks = picks.filter((p) => !seenIds.current.has(p.id));
        newPicks.forEach((p) => seenIds.current.add(p.id));

        if (newPicks.length > 0) {
          setToasts((prev) => [...prev, ...newPicks]);
          // Auto-remove after 4 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => !newPicks.some((n) => n.id === t.id)));
          }, 4000);
        }
      } catch {
        // Silent fail
      }
    };

    poll();
    timer = setInterval(poll, 30000);

    // Pause polling when tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        poll();
        timer = setInterval(poll, 30000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cardId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-in slide-in-from-bottom rounded-card border border-line bg-card px-4 py-2.5 shadow-raised text-sm pointer-events-auto"
          style={{ animation: "slideUp 0.3s ease-out" }}
        >
          <span className="mr-1">{getEmoji(t.name)}</span>
          <span className="font-medium text-ink">{t.name}</span>
          <span className="text-muted"> picked </span>
          <span className={`font-bold ${t.side === "over" ? "text-over" : "text-under"}`}>
            {t.side === "over" ? "Over" : "Under"}
          </span>
        </div>
      ))}
    </div>
  );
}
