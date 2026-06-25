"use client";

import { useEffect, useState } from "react";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";

interface WeeklyEntry {
  user_id: string;
  display_name: string;
  discriminator: string;
  score: number;
  winning_days: number;
  current_streak: number;
  rank: number;
}

interface AllTimeEntry {
  user_id: string;
  display_name: string;
  discriminator: string;
  total_score: number;
  picks_count: number;
  wins: number;
}

interface LeaderboardTabsProps {
  entries: WeeklyEntry[];
  allTime?: AllTimeEntry[];
  currentUserId?: string | null;
  lang?: Lang;
}

type Tab = "weekly" | "alltime" | "skill";

function rankMedal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}`;
}

export function LeaderboardTabs({ entries, allTime = [], currentUserId: serverUserId, lang = "en" }: LeaderboardTabsProps) {
  const S = getDailyLineDict(lang);
  const [tab, setTab] = useState<Tab>("weekly");
  const [myUserId, setMyUserId] = useState<string | null>(serverUserId ?? null);
  const [myRank, setMyRank] = useState<{ rank: number; score: number; displayName: string; discriminator?: string; winningDays?: number; streak?: number } | null>(null);
  const [myAllTimeRank, setMyAllTimeRank] = useState<{ rank: number; score: number; displayName: string; discriminator?: string; wins?: number; picksCount?: number } | null>(null);

  // Resolve device_id → user_id on client + fetch rank
  useEffect(() => {
    const deviceId = localStorage.getItem("gl_device_id");
    if (!deviceId) return;
    fetch(`/api/goalline/my-picks?deviceId=${deviceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.userId) setMyUserId(data.userId);
      })
      .catch(() => {});
  }, []);

  // Fetch user's own rank from leaderboard API
  useEffect(() => {
    if (!myUserId) return;
    fetch(`/api/goalline/leaderboard?userId=${myUserId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.myRank) setMyRank(data.myRank);
        if (data.myAllTimeRank) setMyAllTimeRank(data.myAllTimeRank);
      })
      .catch(() => {});
  }, [myUserId]);

  const currentUserId = myUserId;

  return (
    <div className="mt-4">
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg bg-card p-1">
        <button
          onClick={() => setTab("weekly")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "weekly"
              ? "bg-card-hover text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {S.WEEKLY_TAB}
        </button>
        <button
          onClick={() => setTab("alltime")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "alltime"
              ? "bg-card-hover text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {S.ALL_TIME_TAB}
        </button>
        <button
          onClick={() => setTab("skill")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "skill"
              ? "bg-card-hover text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {S.SKILL_TAB}
        </button>
      </div>

      {/* Weekly table */}
      {tab === "weekly" && (
        <div className="mt-4">
          {entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              {S.NO_ENTRIES_WEEK}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-left font-medium">{S.RANK}</th>
                  <th className="py-2 text-left font-medium">{S.PLAYER}</th>
                  <th className="py-2 text-right font-medium">{S.SCORE}</th>
                  <th className="py-2 text-right font-medium">{S.WINS}</th>
                  <th className="py-2 text-right font-medium">{S.STREAK}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isMe = currentUserId === e.user_id;
                  return (
                    <tr
                      key={e.user_id}
                      className={`border-b border-line/50 last:border-0 ${isMe ? "bg-brand-dim" : ""}`}
                    >
                      <td className="py-3 text-left font-medium">
                        {rankMedal(e.rank)}
                      </td>
                      <td className="py-3 text-left">
                        <span className={`font-medium ${isMe ? "text-brand" : "text-ink"}`}>
                          {e.display_name}
                        </span>
                        <span className="ml-1 text-xs text-muted">
                          #{e.discriminator}
                        </span>
                        {isMe && (
                          <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
                        )}
                      </td>
                      <td className={`py-3 text-right tabular-nums font-medium ${isMe ? "text-brand" : "text-ink"}`}>
                        {e.score}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted">
                        {e.winning_days}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted">
                        {e.current_streak > 0 ? `${e.current_streak}d` : "-"}
                      </td>
                    </tr>
                  );
                })}
                {/* Pin user outside top — same table for alignment */}
                {currentUserId && !entries.some((e) => e.user_id === currentUserId) && myRank && (
                  <>
                    <tr><td colSpan={5} className="py-1"><div className="border-t border-brand/20" /></td></tr>
                    <tr className="bg-brand-dim">
                      <td className="py-3 text-left font-medium text-brand">{myRank.rank}</td>
                      <td className="py-3 text-left">
                        <span className="font-medium text-brand">{myRank.displayName}</span>
                        {myRank.discriminator && <span className="ml-1 text-xs text-muted">#{myRank.discriminator}</span>}
                        <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium text-brand">{myRank.score}</td>
                      <td className="py-3 text-right tabular-nums text-muted">{myRank.winningDays ?? 0}</td>
                      <td className="py-3 text-right tabular-nums text-muted">{myRank.streak ? `${myRank.streak}d` : "-"}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}
          {/* Nudge if no rank at all */}
          {currentUserId && !entries.some((e) => e.user_id === currentUserId) && !myRank && (
            <div className="mt-3 rounded-lg border border-brand/20 bg-brand-dim p-3 text-center text-sm">
              <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
              <span className="ml-2 text-muted">Pick and settle a card to appear on the leaderboard</span>
            </div>
          )}
        </div>
      )}

      {/* All-time tab */}
      {tab === "alltime" && (
        <div className="mt-4">
          {allTime.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              {S.NO_SETTLED_PICKS}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">{S.PLAYER}</th>
                  <th className="py-2 text-right font-medium">{S.SCORE}</th>
                  <th className="py-2 text-right font-medium">{S.WINS}</th>
                  <th className="py-2 text-right font-medium">Picks</th>
                </tr>
              </thead>
              <tbody>
                {allTime.map((e, i) => {
                  const isMe = currentUserId === e.user_id;
                  return (
                    <tr
                      key={e.user_id}
                      className={`border-b border-line/50 last:border-0 ${isMe ? "bg-brand-dim" : ""}`}
                    >
                      <td className="py-3 text-left font-medium">
                        {rankMedal(i + 1)}
                      </td>
                      <td className="py-3 text-left">
                        <span className={`font-medium ${isMe ? "text-brand" : "text-ink"}`}>
                          {e.display_name}
                        </span>
                        <span className="ml-1 text-xs text-muted">
                          #{e.discriminator}
                        </span>
                        {isMe && (
                          <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
                        )}
                      </td>
                      <td className={`py-3 text-right tabular-nums font-medium ${isMe ? "text-brand" : "text-ink"}`}>
                        {e.total_score}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted">
                        {e.wins}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted">
                        {e.picks_count}
                      </td>
                    </tr>
                  );
                })}
                {/* Pin user outside top — same table for alignment */}
                {currentUserId && !allTime.some((e) => e.user_id === currentUserId) && myAllTimeRank && (
                  <>
                    <tr><td colSpan={5} className="py-1"><div className="border-t border-brand/20" /></td></tr>
                    <tr className="bg-brand-dim">
                      <td className="py-3 text-left font-medium text-brand">{myAllTimeRank.rank}</td>
                      <td className="py-3 text-left">
                        <span className="font-medium text-brand">{myAllTimeRank.displayName}</span>
                        {myAllTimeRank.discriminator && <span className="ml-1 text-xs text-muted">#{myAllTimeRank.discriminator}</span>}
                        <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium text-brand">{myAllTimeRank.score}</td>
                      <td className="py-3 text-right tabular-nums text-muted">{myAllTimeRank.wins ?? 0}</td>
                      <td className="py-3 text-right tabular-nums text-muted">{myAllTimeRank.picksCount ?? 0}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}
          {/* Nudge if no rank at all */}
          {currentUserId && !allTime.some((e) => e.user_id === currentUserId) && !myAllTimeRank && (
            <div className="mt-3 rounded-lg border border-brand/20 bg-brand-dim p-3 text-center text-sm">
              <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">You</span>
              <span className="ml-2 text-muted">Pick and settle a card to appear on the leaderboard</span>
            </div>
          )}
        </div>
      )}

      {/* Skill tab — placeholder for MVP */}
      {tab === "skill" && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted">{S.SKILL_COMING_SOON}</p>
        </div>
      )}
    </div>
  );
}
