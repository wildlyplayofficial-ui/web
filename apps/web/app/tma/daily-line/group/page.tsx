"use client";

import { useEffect, useState } from "react";
import { TmaProvider, useTma } from "../tma-context";

interface GroupEntry {
  user_id?: string;
  userId?: string;
  display_name?: string;
  displayName?: string;
  discriminator?: string;
  score: number;
  winning_days?: number;
  current_streak?: number;
  rank: number;
  wins?: number;
  picks?: number;
}

export default function TmaGroupPage() {
  return (
    <TmaProvider>
      <GroupLeaderboard />
    </TmaProvider>
  );
}

function GroupLeaderboard() {
  const { userId, groupId, error: authError } = useTma();
  const [entries, setEntries] = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    fetch(`/api/goalline/group-leaderboard?groupId=${groupId}&type=weekly`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [groupId]);

  const openWebLeaderboard = () => {
    window.Telegram?.WebApp?.openLink(
      "https://www.wildlyplay.com/en/goalline/leaderboard",
    );
  };

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

  if (!groupId) {
    return (
      <div className="mx-auto max-w-lg px-5 py-8 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          No Group Found
        </h1>
        <p className="mt-3 text-sm text-muted">
          Open this Mini App from a group chat to see the group leaderboard.
        </p>
        <button
          onClick={openWebLeaderboard}
          className="mt-6 inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-bg transition-colors hover:bg-brand-hover active:bg-brand-pressed"
          style={{ minHeight: 44 }}
        >
          View Full Leaderboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-8 pb-24">
      <h1 className="font-display text-2xl font-bold text-ink">
        Group Leaderboard
      </h1>
      <p className="mt-1 text-sm text-muted">This week</p>

      <div className="mt-4">
        {entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No picks yet this week. Be the first!
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-medium">#</th>
                <th className="py-2 text-left font-medium">Player</th>
                <th className="py-2 text-right font-medium">Score</th>
                <th className="py-2 text-right font-medium">Wins</th>
                <th className="py-2 text-right font-medium">Streak</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const entryUserId = e.user_id ?? e.userId;
                const entryName = resolveDisplayName(e);
                const isMe = userId === entryUserId;

                return (
                  <tr
                    key={entryUserId}
                    className={`border-b border-line/50 last:border-0 ${
                      isMe ? "bg-brand-dim" : ""
                    }`}
                  >
                    <td className="py-3 text-left font-medium">
                      {rankMedal(e.rank)}
                    </td>
                    <td className="py-3 text-left">
                      <span
                        className={`font-medium ${isMe ? "text-brand" : "text-ink"}`}
                      >
                        {entryName}
                      </span>
                      {e.discriminator && (
                        <span className="ml-1 text-xs text-muted">
                          #{e.discriminator}
                        </span>
                      )}
                      {isMe && (
                        <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                          You
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 text-right tabular-nums font-medium ${
                        isMe ? "text-brand" : "text-ink"
                      }`}
                    >
                      {e.score}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted">
                      {e.winning_days ?? e.wins ?? 0}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted">
                      {(e.current_streak ?? 0) > 0
                        ? `${e.current_streak}d`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom links */}
      <div className="mt-8 space-y-3 text-center">
        <a
          href={`/tma/daily-line${typeof window !== "undefined" ? window.location.search : ""}`}
          className="inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-bg transition-colors hover:bg-brand-hover active:bg-brand-pressed"
          style={{ minHeight: 44 }}
        >
          Back to Today&apos;s Card
        </a>
        <div>
          <button
            onClick={openWebLeaderboard}
            className="text-sm text-brand underline"
          >
            Full leaderboard on web
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function rankMedal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}`;
}

function resolveDisplayName(e: GroupEntry): string {
  // API returns gl_users join as nested object or flat fields
  const raw = e as unknown as Record<string, unknown>;
  if (e.display_name) return e.display_name;
  if (e.displayName) return e.displayName;
  const glUsers = raw.gl_users as
    | { display_name: string }
    | { display_name: string }[]
    | undefined;
  if (glUsers) {
    const u = Array.isArray(glUsers) ? glUsers[0] : glUsers;
    return u?.display_name ?? "Anonymous";
  }
  return "Anonymous";
}
