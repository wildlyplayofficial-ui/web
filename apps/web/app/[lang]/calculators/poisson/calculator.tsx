"use client";

import { useState } from "react";

/** Poisson probability mass: P(X = k) for mean lambda. */
function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // exp(-lambda) * lambda^k / k!  — computed in log space for stability.
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

const MAX_GOALS = 10; // truncate the scoreline grid; tail beyond 10 is negligible.
const LINES = [0.5, 1.5, 2.5, 3.5, 4.5] as const;

function parseGoals(input: string): number | null {
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 && n <= 12 ? n : null;
}

function fairOdds(p: number): string {
  if (p <= 0) return "—";
  return (1 / p).toFixed(2);
}

export function PoissonCalculator() {
  const [homeInput, setHomeInput] = useState("");
  const [awayInput, setAwayInput] = useState("");
  const [line, setLine] = useState<number>(2.5);

  const homeXg = parseGoals(homeInput);
  const awayXg = parseGoals(awayInput);
  const hasResult = homeXg !== null && awayXg !== null && homeXg + awayXg > 0;

  let over = 0;
  let btts = 0;
  let bestScore = { h: 0, a: 0, p: 0 };
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  if (hasResult) {
    // Independent Poisson for each side; joint scoreline grid.
    const hp = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, homeXg!));
    const ap = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, awayXg!));
    for (let h = 0; h <= MAX_GOALS; h++) {
      for (let a = 0; a <= MAX_GOALS; a++) {
        const p = hp[h] * ap[a];
        if (h + a > line) over += p;
        if (h >= 1 && a >= 1) btts += p;
        if (h > a) homeWin += p;
        else if (h === a) draw += p;
        else awayWin += p;
        if (p > bestScore.p) bestScore = { h, a, p };
      }
    }
  }
  const under = hasResult ? 1 - over : 0;

  return (
    <div className="mt-8 space-y-6">
      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Home expected goals (xG)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={homeInput}
            onChange={(e) => setHomeInput(e.target.value)}
            placeholder="1.6"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Away expected goals (xG)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={awayInput}
            onChange={(e) => setAwayInput(e.target.value)}
            placeholder="1.1"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Total goals line */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Total goals line</label>
        <div className="flex flex-wrap gap-1 rounded-lg bg-card p-1 w-fit">
          {LINES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLine(l)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${line === l ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
            >
              {l.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {hasResult && (
        <div className="rounded-card border border-line bg-card p-5 shadow-card">
          {/* Over / Under */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-bg px-4 py-3 text-center">
              <div className="text-xs text-muted">Over {line.toFixed(1)}</div>
              <div className="font-display text-3xl font-bold text-brand">{(over * 100).toFixed(1)}%</div>
              <div className="mt-0.5 text-xs text-muted">fair {fairOdds(over)}</div>
            </div>
            <div className="rounded-md bg-bg px-4 py-3 text-center">
              <div className="text-xs text-muted">Under {line.toFixed(1)}</div>
              <div className="font-display text-3xl font-bold text-ink">{(under * 100).toFixed(1)}%</div>
              <div className="mt-0.5 text-xs text-muted">fair {fairOdds(under)}</div>
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-md bg-bg px-3 py-2">
              <div className="text-xs text-muted">Most likely score</div>
              <div className="font-display font-bold text-ink">{bestScore.h}&ndash;{bestScore.a}</div>
            </div>
            <div className="rounded-md bg-bg px-3 py-2">
              <div className="text-xs text-muted">BTTS</div>
              <div className="font-display font-bold text-ink">{(btts * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-md bg-bg px-3 py-2">
              <div className="text-xs text-muted">Expected total</div>
              <div className="font-display font-bold text-ink">{(homeXg! + awayXg!).toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-bg px-3 py-2">
              <div className="text-xs text-muted">1X2</div>
              <div className="font-display text-sm font-bold text-ink">
                {(homeWin * 100).toFixed(0)}/{(draw * 100).toFixed(0)}/{(awayWin * 100).toFixed(0)}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-warning-dim bg-warning-dim/30 px-4 py-3">
            <p className="text-xs text-warning">
              <strong>Model, not a crystal ball.</strong> A Poisson model assumes goals arrive
              independently at a constant rate — real matches have red cards, game state and
              correlation it can&apos;t see. The output is only as good as your xG inputs.
              Not financial advice. 18+ — entertainment only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
