"use client";

import { useCallback, useEffect, useState } from "react";
import { TmaProvider, useTma } from "./tma-context";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type {
  DailyCard,
  CardMatch,
  UserPick,
  PickSide,
  CardViewState,
} from "@/lib/goalline/types";
import {
  CardOpenUnpicked,
  CardPicked,
  CardLockedNoPick,
} from "./components/card-open";
import {
  CardLive,
  CardSettled,
  CardVoided,
} from "./components/card-result";
import {
  TmaBottomNav,
  TmaEngagementBar,
  TmaHowItWorks,
} from "./components/ui";

const S = getDailyLineDict("en");

export default function TmaPage() {
  return (
    <TmaProvider>
      <TmaHome />
    </TmaProvider>
  );
}

/* ── State machine (mirrors goalline/page.tsx) ─────────────────────────── */

function deriveViewState(
  card: DailyCard | null,
  pick: UserPick | null,
): CardViewState {
  if (!card) return "no_card";
  switch (card.status) {
    case "open":
      return pick ? "open_picked" : "open_unpicked";
    case "locked":
      return "locked";
    case "live":
      return "live";
    case "settled":
      return "settled";
    case "voided":
      return "voided";
    default:
      return "no_card";
  }
}

/* ── Main component ────────────────────────────────────────────────────── */

function TmaHome() {
  const { userId, groupId, displayName, error: authError } = useTma();
  const [card, setCard] = useState<DailyCard | null>(null);
  const [matches, setMatches] = useState<CardMatch[]>([]);
  const [pick, setPick] = useState<UserPick | null>(null);
  const [communitySplit, setCommunitySplit] = useState<{
    over: number;
    under: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState("");

  // Fetch today's card
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/goalline/card/today?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setCard(data.card ?? null);
        setMatches(data.matches ?? []);
        setPick(data.pick ?? null);
        setCommunitySplit(data.communitySplit ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  // Submit pick
  const submitPick = useCallback(
    async (side: PickSide) => {
      if (!userId || !card) return;
      setPickLoading(true);
      setPickError("");
      try {
        const res = await fetch("/api/goalline/pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, cardId: card.id, side }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPickError(data.error ?? "Something went wrong");
          setPickLoading(false);
          return;
        }
        setPick(data.pick);
        setPickLoading(false);
        // Refetch to get community split
        const refresh = await fetch(
          `/api/goalline/card/today?userId=${userId}`,
        );
        const refreshData = await refresh.json();
        setCommunitySplit(refreshData.communitySplit ?? null);
      } catch {
        setPickError("Network error. Try again.");
        setPickLoading(false);
      }
    },
    [userId, card],
  );

  const shareResult = useCallback(() => {
    if (!card || !pick) return;
    // Games API webview: use native share
    if (window.TelegramGameProxy) {
      window.TelegramGameProxy.shareScore();
      return;
    }
    // Mini App SDK: use inline query share
    const side = pick.side === "over" ? "Over" : "Under";
    const outcome =
      pick.status === "won" ? "Won" : pick.status === "lost" ? "Lost" : "";
    const text = outcome
      ? `Daily Line #${card.card_number}: I picked ${side} ${card.goal_line} and ${outcome}!`
      : `Daily Line #${card.card_number}: I picked ${side} ${card.goal_line}`;
    const webapp = window.Telegram?.WebApp;
    if (webapp?.switchInlineQuery) {
      webapp.switchInlineQuery(text, ["users", "groups"]);
    }
  }, [card, pick]);

  const viewState = deriveViewState(card, pick);

  if (authError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-center text-sm text-muted">{authError}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6 pb-24">
      {/* Header */}
      {card && (
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            {S.CARD_LABEL} #{card.card_number}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink mt-1">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(card.utc_date + "T00:00:00Z"))}
          </h1>
        </header>
      )}

      {/* How it works (collapsible) */}
      <TmaHowItWorks />

      {/* Engagement bar */}
      {card && <TmaEngagementBar cardId={card.id} />}

      {/* No card state */}
      {viewState === "no_card" && (
        <div className="flex min-h-[50dvh] items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-ink">
              {S.NO_CARD_TITLE}
            </h1>
            <p className="mt-3 text-muted">{S.NO_CARD_BODY}</p>
          </div>
        </div>
      )}

      {/* Open unpicked */}
      {viewState === "open_unpicked" && card && (
        <CardOpenUnpicked
          card={card}
          matches={matches}
          S={S}
          onPick={submitPick}
          pickLoading={pickLoading}
          pickError={pickError}
          onClearError={() => setPickError("")}
        />
      )}

      {/* Open picked / Locked with pick */}
      {(viewState === "open_picked" || (viewState === "locked" && pick)) &&
        card &&
        pick && (
          <CardPicked
            card={card}
            matches={matches}
            pick={pick}
            communitySplit={communitySplit}
            S={S}
            isOpen={viewState === "open_picked"}
            onShare={shareResult}
          />
        )}

      {/* Locked without pick */}
      {viewState === "locked" && card && !pick && (
        <CardLockedNoPick card={card} matches={matches} S={S} />
      )}

      {/* Live */}
      {viewState === "live" && card && (
        <CardLive card={card} matches={matches} pick={pick} S={S} />
      )}

      {/* Settled */}
      {viewState === "settled" && card && (
        <CardSettled
          card={card}
          matches={matches}
          pick={pick}
          S={S}
          onShare={shareResult}
        />
      )}

      {/* Voided */}
      {viewState === "voided" && card && <CardVoided card={card} S={S} />}

      {/* Bottom nav */}
      {card && <TmaBottomNav groupId={groupId} displayName={displayName} />}
    </div>
  );
}
