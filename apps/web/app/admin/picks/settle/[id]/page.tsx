"use client";

import { useActionState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { settlePickAction } from "@/lib/admin-actions";
import type { RawOutcome } from "@/lib/types";

const OUTCOMES: { value: RawOutcome; label: string }[] = [
  { value: "win", label: "Won" },
  { value: "loss", label: "Lost" },
  { value: "push", label: "Push" },
  { value: "half_win", label: "Half Win" },
  { value: "half_loss", label: "Half Loss" },
];

function calcPreview(outcome: RawOutcome, odds: number, stake: number): number {
  switch (outcome) {
    case "win": return (odds - 1) * stake;
    case "loss": return -stake;
    case "push": case "void": return 0;
    case "half_win": return ((odds - 1) * stake) / 2;
    case "half_loss": return -stake / 2;
  }
}

/** Auto-determine outcome from score + market + line + selection. */
function autoOutcome(
  homeScore: number, awayScore: number,
  market: string, line: number | null, selection: string,
): RawOutcome | null {
  const sel = selection.toLowerCase();
  const total = homeScore + awayScore;
  const diff = homeScore - awayScore;

  if (market === "ou" && line != null) {
    const isOver = sel.startsWith("over");
    const margin = isOver ? total - line : line - total;
    if (margin >= 0.5) return "win";
    if (margin > 0 && margin < 0.5) return "half_win";
    if (margin === 0) return "push";
    if (margin < 0 && margin > -0.5) return "half_loss";
    return "loss"; // margin <= -0.5
  }

  if (market === "ah" && line != null) {
    const isHome = sel.includes("home") || sel.toLowerCase().includes(selection.split(" ")[0]?.toLowerCase() ?? "");
    const adjDiff = isHome ? diff + line : -diff + line;
    if (adjDiff > 0.5) return "win";
    if (adjDiff > 0 && adjDiff <= 0.5) return "half_win";
    if (adjDiff === 0) return "push";
    if (adjDiff < 0 && adjDiff >= -0.5) return "half_loss";
    return "loss";
  }

  if (market === "1x2") {
    if (sel === "draw" || sel === "x") return total === homeScore + awayScore && homeScore === awayScore ? "win" : "loss";
    const pickedHome = sel.includes("home");
    if (pickedHome) return diff > 0 ? "win" : "loss";
    return diff < 0 ? "win" : "loss";
  }

  return null;
}

const inputCls = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none";
const labelCls = "mb-1 block text-sm text-muted";

export default function SettlePickPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [outcome, setOutcome] = useState<RawOutcome>("win");
  const [odds, setOdds] = useState(1.9);
  const [stake, setStake] = useState(1);
  const [pickInfo, setPickInfo] = useState("");
  const [market, setMarket] = useState("");
  const [line, setLine] = useState<number | null>(null);
  const [selection, setSelection] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  useEffect(() => {
    fetch(`/api/goalline/pick-info?id=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.odds_publish) setOdds(data.odds_publish);
        if (data.stake_units) setStake(data.stake_units);
        if (data.market) setMarket(data.market);
        if (data.line != null) setLine(data.line);
        if (data.selection) setSelection(data.selection);
        if (data.home_team && data.away_team) {
          const lineStr = data.line != null ? ` (${data.line})` : "";
          setPickInfo(`${data.home_team} vs ${data.away_team} · ${data.market?.toUpperCase()} ${data.selection}${lineStr} @ ${data.odds_publish}`);
        }
      })
      .catch(() => {});
  }, [params.id]);

  // Auto-calculate outcome when scores change
  const recalcOutcome = useCallback(() => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || !market || !selection) return;
    const auto = autoOutcome(h, a, market, line, selection);
    if (auto) setOutcome(auto);
  }, [homeScore, awayScore, market, line, selection]);

  useEffect(() => { recalcOutcome(); }, [recalcOutcome]);

  const preview = calcPreview(outcome, odds, stake);
  const previewStr = preview >= 0 ? `+${preview.toFixed(2)}u` : `${preview.toFixed(2)}u`;

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await settlePickAction(formData);
      if (result.error) return { error: result.error };
      router.push("/admin/picks");
      return { error: null };
    },
    { error: null },
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 font-display text-2xl font-bold">Settle Pick</h1>
      {pickInfo && <p className="mb-4 text-sm text-muted">{pickInfo}</p>}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="pickId" value={params.id} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="homeScore" className={labelCls}>Home Score</label>
            <input id="homeScore" name="homeScore" type="number" min="0" required
              value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="awayScore" className={labelCls}>Away Score</label>
            <input id="awayScore" name="awayScore" type="number" min="0" required
              value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="outcome" className={labelCls}>Outcome {homeScore && awayScore ? "(auto)" : ""}</label>
          <select id="outcome" name="outcome" required className={inputCls} value={outcome}
            onChange={(e) => setOutcome(e.target.value as RawOutcome)}>
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="previewOdds" className={labelCls}>Odds</label>
            <input id="previewOdds" type="number" step="0.01" min="1.01" value={odds}
              onChange={(e) => setOdds(Number(e.target.value) || 1.01)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="previewStake" className={labelCls}>Stake</label>
            <input id="previewStake" type="number" step="0.25" min="0.25" value={stake}
              onChange={(e) => setStake(Number(e.target.value) || 1)} className={inputCls} />
          </div>
        </div>

        <div className="rounded-card border border-line bg-card p-4 text-center">
          <p className="text-sm text-muted">Estimated P/L</p>
          <p className={`mt-1 font-display text-xl font-bold ${preview >= 0 ? "text-brand" : "text-loss"}`}>
            {previewStr}
          </p>
        </div>

        {state.error && <p className="text-sm text-loss">{state.error}</p>}

        <button type="submit" disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
          {pending ? "Settling..." : "Settle Pick"}
        </button>
      </form>
    </div>
  );
}
