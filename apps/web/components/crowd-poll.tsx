"use client";

import { useEffect, useState } from "react";
import { getDict, type Lang } from "@/lib/i18n";
import type { VoteCounts, VoteKind } from "@/lib/types";

const KINDS: readonly VoteKind[] = ["follow", "fade", "skip"] as const;

/**
 * Crowd poll: Follow / Fade / Skip on published picks (decision #5, 11/6 — v1
 * lightweight engagement). Optimistic counts; the voter's own choice is kept in
 * localStorage, identity in an httpOnly cookie set by /api/vote.
 */
export function CrowdPoll({
  pickId,
  lang,
  initial,
}: {
  pickId: string;
  lang: Lang;
  initial: VoteCounts;
}) {
  const dict = getDict(lang);
  const [counts, setCounts] = useState<VoteCounts>(initial);
  const [own, setOwn] = useState<VoteKind | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`wp_vote_${pickId}`);
    if (saved && (KINDS as readonly string[]).includes(saved)) setOwn(saved as VoteKind);
  }, [pickId]);

  function vote(kind: VoteKind): void {
    if (kind === own) return;
    const prevCounts = counts;
    const prevOwn = own;
    const next = { ...counts, [kind]: counts[kind] + 1 };
    if (own) next[own] = Math.max(0, next[own] - 1);
    setCounts(next);
    setOwn(kind);
    try {
      localStorage.setItem(`wp_vote_${pickId}`, kind);
    } catch {
      // storage unavailable (private mode) — the vote still counts server-side
    }
    fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pick_id: pickId, vote: kind }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`vote failed: ${res.status}`);
      })
      .catch(() => {
        setCounts(prevCounts);
        setOwn(prevOwn);
      });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-xs text-muted">{dict.poll.title}</span>
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => vote(kind)}
          aria-pressed={own === kind}
          className={`rounded-full border px-3.5 py-1 font-display text-xs font-semibold transition-colors ${
            own === kind
              ? "border-brand/40 bg-brand-dim text-brand"
              : "border-line bg-card text-muted hover:text-ink"
          }`}
        >
          {dict.poll[kind]} · {counts[kind]}
        </button>
      ))}
    </div>
  );
}
