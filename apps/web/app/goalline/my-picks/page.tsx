"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getDailyLineDict } from "@/lib/goalline/strings";
import { resolveLang, withLang } from "@/lib/i18n";

interface CardInfo {
  cardNumber: number;
  utcDate: string;
  goalLine: number;
}

interface Pick {
  id: string;
  side: string;
  oddsLocked: number;
  stakePoints: number;
  status: string;
  pointsAwarded: number | null;
  createdAt: string;
  card: CardInfo | null;
}

function statusBadge(status: string): string {
  switch (status) {
    case "won": return "text-over";
    case "lost": return "text-loss";
    case "void": return "text-muted";
    default: return "text-ink";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "Locked";
    case "won": return "Won";
    case "lost": return "Lost";
    case "void": return "Void";
    default: return status;
  }
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

export default function MyPicksPage() {
  const searchParams = useSearchParams();
  const lang = resolveLang(searchParams.get("lang") ?? undefined);
  const S = getDailyLineDict(lang);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [discriminator, setDiscriminator] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const deviceId = localStorage.getItem("gl_device_id");
    if (!deviceId) {
      setLoading(false);
      return;
    }

    fetch(`/api/goalline/my-picks?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPicks(data.picks ?? []);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.discriminator) setDiscriminator(data.discriminator);
        }
      })
      .catch(() => setError("Failed to load picks."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        {displayName
          ? <>{animalEmoji(displayName)} {displayName}{discriminator && <span className="ml-1 text-sm text-muted">#{discriminator}</span>}</>
          : S.NAV_MY_PICKS}
      </h1>

      {loading && (
        <p className="mt-8 text-center text-sm text-muted">...</p>
      )}

      {!loading && error && (
        <p className="mt-8 text-center text-sm text-loss">{error}</p>
      )}

      {!loading && !error && picks.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted">{S.NO_CARD_TITLE}</p>
      )}

      {!loading && !error && picks.length > 0 && (
        <ul className="mt-6 space-y-3">
          {picks.map((p) => (
            <li key={p.id}>
            <Link
              href={p.card ? withLang(`/daily-line/card/${p.card.cardNumber}`, lang) : "#"}
              className="block rounded-xl border border-line bg-card px-4 py-4 transition hover:border-brand"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">
                    {p.card ? `Card #${p.card.cardNumber} · ${p.card.utcDate}` : "Unknown card"}
                  </p>
                  <p className="mt-1 font-display font-bold text-ink">
                    {p.side === "over" ? S.OVER : S.UNDER}
                    {p.card ? ` ${p.card.goalLine}` : ""}
                    <span className="ml-2 text-sm font-normal text-muted">
                      @ {p.oddsLocked.toFixed(2)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${statusBadge(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                  {p.pointsAwarded != null && (
                    <p className="mt-0.5 text-xs text-muted">
                      {p.pointsAwarded > 0 ? `+${p.pointsAwarded}` : p.pointsAwarded} pts
                    </p>
                  )}
                </div>
              </div>
            </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
