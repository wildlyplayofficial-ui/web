"use client";

import { useState } from "react";
import Link from "next/link";
import { teamFlag } from "@/lib/flags";
import { formatUnits } from "@/lib/format";
import { withLang, type Lang } from "@/lib/i18n";
import type { Pick } from "@/lib/types";

/** CLV = (publish / close - 1) × 100. Only when close is known. */
function clv(pick: Pick): string | null {
  if (!pick.odds_close || pick.odds_close <= 0) return null;
  const pct = (pick.odds_publish / pick.odds_close - 1) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

const statusBadge: Record<string, { letter: string; cls: string }> = {
  won: { letter: "W", cls: "border-brand/40 bg-brand-dim text-brand" },
  lost: { letter: "L", cls: "border-loss/40 bg-loss/10 text-loss" },
  push: { letter: "P", cls: "border-line bg-card text-muted" },
};

export function ArchiveRow({
  pick,
  lang,
  thesisText,
}: {
  pick: Pick;
  lang: Lang;
  thesisText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadge[pick.status] ?? statusBadge.push;
  const clvVal = clv(pick);
  const thesis = thesisText ?? pick.thesis;
  const hf = teamFlag(pick.home_team);
  const af = teamFlag(pick.away_team);

  return (
    <div className="rounded-card border border-line bg-card transition-colors hover:border-line-hover">
      {/* Compact row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* W/L/P badge */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-sm font-bold ${badge.cls}`}
        >
          {badge.letter}
        </span>

        {/* Match + selection */}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold">
            {hf && <span className="mr-1">{hf}</span>}
            {pick.home_team}
            {pick.home_score !== null && ` ${pick.home_score}`}
            <span className="mx-1 text-muted">&ndash;</span>
            {pick.away_score !== null && `${pick.away_score} `}
            {pick.away_team}
            {af && <span className="ml-1">{af}</span>}
          </span>
          <span className="block truncate text-xs text-muted">
            {pick.league} · {pick.selection} @ {pick.odds_publish} · {pick.stake_units}u
          </span>
        </span>

        {/* CLV */}
        {clvVal && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 font-display text-xs font-bold ${
              clvVal.startsWith("+")
                ? "border-brand/30 text-brand"
                : "border-loss/30 text-loss"
            }`}
          >
            CLV {clvVal}
          </span>
        )}

        {/* Units P/L */}
        <span
          className={`shrink-0 font-display text-sm font-semibold ${
            (pick.units_pl ?? 0) >= 0 ? "text-brand" : "text-loss"
          }`}
        >
          {formatUnits(pick.units_pl ?? 0)}
        </span>

        {/* Expand arrow */}
        <span className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {/* Expanded thesis */}
      {expanded && thesis && (
        <div className="border-t border-line px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{thesis}</p>
          <Link
            href={withLang(`/play/${pick.id}`, lang)}
            className="mt-3 inline-block font-display text-xs font-semibold text-brand hover:underline"
          >
            View full play &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
