"use client";

import { useCallback, useEffect, useState } from "react";
import { TmaProvider, useTma } from "./tma-context";
import type {
  DailyCard,
  CardMatch,
  UserPick,
  PickSide,
  CardViewState,
} from "@/lib/goalline/types";

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
  const { userId, token, groupId, displayName, error: authError } = useTma();
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
  const [confirmSide, setConfirmSide] = useState<PickSide | null>(null);

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
        setConfirmSide(null);
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

  const totalGoals = matches.reduce(
    (sum, m) => sum + (m.valid_goals ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-lg px-5 py-6 pb-24">
      {/* Header */}
      {card && (
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            Daily Line #{card.card_number}
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

      {/* No card state */}
      {viewState === "no_card" && (
        <div className="flex min-h-[50dvh] items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-ink">
              No Card Today
            </h1>
            <p className="mt-3 text-muted">Check back soon for the next card.</p>
          </div>
        </div>
      )}

      {/* Open unpicked — show pick buttons */}
      {viewState === "open_unpicked" && card && (
        <div className="space-y-6">
          {/* Goal Line hero */}
          <div className="rounded-card border border-line bg-gradient-to-b from-card to-bg p-6 shadow-card text-center">
            <p className="text-xs font-medium tracking-wider text-muted uppercase">
              Combined Goal Line
            </p>
            <p className="font-display text-6xl font-bold text-ink mt-2">
              {card.goal_line}
            </p>
          </div>

          {/* Confirmation overlay */}
          {confirmSide ? (
            <div className="rounded-xl border border-line bg-card p-5 text-center">
              <h3 className="font-display text-lg font-bold text-ink">
                Confirm Your Pick
              </h3>
              <p className="mt-2 text-sm text-muted">
                {confirmSide === "over" ? "Over" : "Under"} {card.goal_line} @{" "}
                {(confirmSide === "over"
                  ? card.over_odds
                  : card.under_odds
                ).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-loss">
                Cannot be changed after locking.
              </p>
              {pickError && (
                <p className="mt-2 text-sm text-loss">{pickError}</p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => {
                    setConfirmSide(null);
                    setPickError("");
                  }}
                  className="flex-1 rounded-lg border border-line px-4 py-3 text-sm font-medium text-muted transition hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitPick(confirmSide)}
                  disabled={pickLoading}
                  className="flex-1 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
                >
                  {pickLoading ? "Locking..." : "Lock It In"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmSide("over")}
                className="min-w-0 rounded-xl border-2 border-over bg-over-dim px-3 py-5 text-center transition hover:bg-over/20 active:scale-[0.98]"
              >
                <span className="block font-display text-lg font-bold text-over">
                  &#9650; Over
                </span>
                <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">
                  {card.over_odds.toFixed(2)}
                </span>
              </button>
              <button
                onClick={() => setConfirmSide("under")}
                className="min-w-0 rounded-xl border-2 border-under bg-under-dim px-3 py-5 text-center transition hover:bg-under/20 active:scale-[0.98]"
              >
                <span className="block font-display text-lg font-bold text-under">
                  &#9660; Under
                </span>
                <span className="block font-display text-2xl font-bold tabular-nums text-ink mt-1">
                  {card.under_odds.toFixed(2)}
                </span>
              </button>
            </div>
          )}

          {/* Matches */}
          <div>
            <p className="mb-3 text-xs font-medium tracking-wider text-muted uppercase">
              Matches
            </p>
            <TmaMatchList matches={matches} />
          </div>

          {/* Countdown */}
          <TmaCountdown targetUtc={card.cutoff_time_utc} label="Cutoff" />
        </div>
      )}

      {/* Open picked / Locked — show locked state */}
      {(viewState === "open_picked" || viewState === "locked") &&
        card &&
        pick && (
          <div className="space-y-6">
            <LockedPickBanner
              card={card}
              pick={pick}
              communitySplit={communitySplit}
            />
            <TmaMatchList matches={matches} />
            {viewState === "open_picked" && (
              <TmaCountdown
                targetUtc={
                  matches.reduce(
                    (earliest, m) =>
                      m.kickoff_time_utc < earliest
                        ? m.kickoff_time_utc
                        : earliest,
                    matches[0]?.kickoff_time_utc ?? card.cutoff_time_utc,
                  )
                }
                label="First Kickoff"
              />
            )}
            <ShareButton onClick={shareResult} label="Share Pick" />
          </div>
        )}

      {/* Live */}
      {viewState === "live" && card && (
        <div className="space-y-6">
          <div className="rounded-card border border-brand/30 bg-brand-dim p-4 shadow-card text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />
              <p className="text-xs font-bold tracking-wider text-brand uppercase">
                Live
              </p>
            </div>
            <p className="font-display text-5xl font-bold text-ink mt-3">
              {totalGoals}
            </p>
            <p className="text-sm text-muted mt-1">
              Goal Line: {card.goal_line}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              {totalGoals > card.goal_line ? (
                <span className="text-over">Over has clinched!</span>
              ) : (
                <span className="text-under">
                  {Math.ceil(card.goal_line) - totalGoals} more for Over
                </span>
              )}
            </p>
          </div>
          {pick && (
            <div className="text-center text-sm text-muted">
              Your pick:{" "}
              <span
                className={
                  pick.side === "over"
                    ? "font-bold text-over"
                    : "font-bold text-under"
                }
              >
                {pick.side === "over" ? "Over" : "Under"} {card.goal_line}
              </span>
            </div>
          )}
          <TmaMatchList matches={matches} />
        </div>
      )}

      {/* Settled */}
      {viewState === "settled" && card && (
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
            <p className="text-xs font-medium tracking-wider text-muted uppercase">
              Final Result
            </p>
            <p className="font-display text-4xl font-bold tabular-nums text-ink mt-3">
              {totalGoals}{" "}
              <span className="text-muted">vs</span> {card.goal_line}
            </p>
            <p className="mt-3 text-sm text-muted">
              Winner:{" "}
              <span className="font-display font-bold text-brand">
                {card.settlement_result === "over" ? "Over" : "Under"}
              </span>
            </p>
          </div>
          {pick && (
            <div
              className={`rounded-card border p-4 shadow-card text-center ${
                pick.status === "won"
                  ? "border-brand/30 bg-brand-dim"
                  : "border-loss/30 bg-loss-dim"
              }`}
            >
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Your Result
              </p>
              <p
                className={`font-display text-2xl font-bold mt-1 ${
                  pick.status === "won" ? "text-brand" : "text-loss"
                }`}
              >
                {pick.status === "won" ? "Won!" : "Lost"}
              </p>
              {pick.points_added !== null && (
                <p className="mt-2 text-sm text-muted">
                  Points:{" "}
                  <span className="font-display font-bold tabular-nums text-ink">
                    {pick.points_added > 0 ? "+" : ""}
                    {pick.points_added}
                  </span>
                </p>
              )}
            </div>
          )}
          <TmaMatchList matches={matches} />
          <ShareButton onClick={shareResult} label="Share Result" />
        </div>
      )}

      {/* Voided */}
      {viewState === "voided" && card && (
        <div className="rounded-card border border-loss/30 bg-loss-dim p-4 shadow-card text-center">
          <p className="font-display text-xl font-bold text-ink">
            Card Voided
          </p>
          <p className="mt-2 text-sm text-muted">
            All stakes refunded. No points affected.
          </p>
          {card.void_reason && (
            <p className="mt-3 text-xs text-muted">
              Reason: {card.void_reason}
            </p>
          )}
        </div>
      )}

      {/* Bottom nav */}
      {card && <TmaBottomNav groupId={groupId} displayName={displayName} />}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function LockedPickBanner({
  card,
  pick,
  communitySplit,
}: {
  card: DailyCard;
  pick: UserPick;
  communitySplit: { over: number; under: number } | null;
}) {
  const sideLabel = pick.side === "over" ? "Over" : "Under";
  const sideColor = pick.side === "over" ? "text-over" : "text-under";
  const payout = Math.round(pick.stake_points * pick.odds_locked);

  return (
    <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
      <p className="text-xs font-medium tracking-wider text-muted uppercase">
        Your Pick — Locked
      </p>
      <p className={`font-display text-3xl font-bold ${sideColor} mt-1`}>
        {sideLabel} {card.goal_line}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted">Odds</p>
          <p className="font-display font-bold tabular-nums text-ink">
            {pick.odds_locked.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Potential Payout</p>
          <p className="font-display font-bold tabular-nums text-ink">
            {payout} pts
          </p>
        </div>
      </div>
      {communitySplit && (
        <div className="mt-4 border-t border-line-muted pt-4">
          <p className="text-xs text-muted">Community Split</p>
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-2 rounded-full bg-over"
              style={{ width: `${communitySplit.over}%` }}
            />
            <div
              className="h-2 rounded-full bg-under"
              style={{ width: `${communitySplit.under}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Over {communitySplit.over}%</span>
            <span>Under {communitySplit.under}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TmaMatchList({ matches }: { matches: CardMatch[] }) {
  const sorted = [...matches].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const isLive = m.status === "live";
        const isFinished = m.status === "finished";
        const hasScore =
          (isFinished || isLive) &&
          m.home_score !== null &&
          m.away_score !== null;

        return (
          <div
            key={m.id}
            className={`rounded-card border bg-card px-3 py-3 shadow-card transition-colors ${
              isLive ? "border-brand/30" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-display text-sm font-semibold text-ink truncate">
                  {m.home_team} — {m.away_team}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {new Date(m.kickoff_time_utc).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {hasScore && (
                  <span className="font-display text-lg font-bold tabular-nums text-ink">
                    {m.home_score} – {m.away_score}
                  </span>
                )}
                <MatchStatusBadge status={m.status} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchStatusBadge({ status }: { status: CardMatch["status"] }) {
  switch (status) {
    case "live":
      return (
        <span className="inline-flex items-center gap-1 rounded-pill bg-brand-dim px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live
        </span>
      );
    case "finished":
      return (
        <span className="rounded-pill bg-card-hover px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          FT
        </span>
      );
    case "postponed":
      return (
        <span className="rounded-pill bg-warning-dim px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
          PPD
        </span>
      );
    default:
      return (
        <span className="rounded-pill bg-card-hover px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
          Soon
        </span>
      );
  }
}

function TmaCountdown({
  targetUtc,
  label,
}: {
  targetUtc: string;
  label: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetUtc));

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

function ShareButton({
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

function TmaBottomNav({
  groupId,
  displayName,
}: {
  groupId: string | null;
  displayName: string | null;
}) {
  const leaderboardHref = groupId
    ? "/tma/daily-line/group"
    : "https://www.wildlyplay.com/en/goalline/leaderboard";

  const openWebLeaderboard = () => {
    window.Telegram?.WebApp?.openLink(
      "https://www.wildlyplay.com/en/goalline/leaderboard",
    );
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <div className="text-xs text-muted truncate max-w-[140px]">
          {displayName && <span>{displayName}</span>}
        </div>
        <div className="flex items-center gap-3">
          {groupId ? (
            <a
              href={leaderboardHref}
              className="rounded-md bg-card-hover px-3 py-2 text-xs font-medium text-ink transition hover:bg-line"
            >
              Group Board
            </a>
          ) : null}
          <button
            onClick={openWebLeaderboard}
            className="rounded-md bg-brand/10 px-3 py-2 text-xs font-medium text-brand transition hover:bg-brand/20"
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function calcTimeLeft(targetUtc: string) {
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
