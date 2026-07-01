"use client";

import { useState } from "react";

const HARD_CAP = 25; // never display >25% stake

function parseOdds(input: string, format: "american" | "decimal"): number | null {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  if (format === "decimal") return n > 1 ? n : null;
  if (n === 0) return null;
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
}

function kellyFraction(prob: number, decimalOdds: number): number {
  const b = decimalOdds - 1;
  const q = 1 - prob;
  const f = (b * prob - q) / b;
  return f;
}

export function KellyCalculator() {
  const [format, setFormat] = useState<"american" | "decimal">("american");
  const [oddsInput, setOddsInput] = useState("");
  const [probInput, setProbInput] = useState("");
  const [fraction, setFraction] = useState(0.25);

  const decimalOdds = parseOdds(oddsInput, format);
  const prob = Number(probInput);
  const probValid = Number.isFinite(prob) && prob > 0 && prob < 100;

  const hasResult = decimalOdds !== null && probValid;

  const fullKelly = hasResult ? kellyFraction(prob / 100, decimalOdds) : null;
  const fractionalKelly = fullKelly !== null ? fullKelly * fraction : null;
  const displayKelly = fractionalKelly !== null ? Math.min(fractionalKelly * 100, HARD_CAP) : null;
  const capped = fractionalKelly !== null && fractionalKelly * 100 > HARD_CAP;
  const noEdge = fullKelly !== null && fullKelly <= 0;

  return (
    <div className="mt-8 space-y-6">
      {/* Odds format */}
      <div className="flex rounded-lg bg-card p-1 w-fit">
        <button
          type="button"
          onClick={() => { setFormat("american"); setOddsInput(""); }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${format === "american" ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
        >
          American
        </button>
        <button
          type="button"
          onClick={() => { setFormat("decimal"); setOddsInput(""); }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${format === "decimal" ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
        >
          Decimal
        </button>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Odds ({format === "american" ? "American" : "Decimal"})
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={oddsInput}
            onChange={(e) => setOddsInput(e.target.value)}
            placeholder={format === "american" ? "-110" : "1.91"}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Your estimated probability (%)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={probInput}
            onChange={(e) => setProbInput(e.target.value)}
            placeholder="55"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Kelly fraction slider */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          Kelly fraction: {Math.round(fraction * 100)}%
        </label>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={fraction}
          onChange={(e) => setFraction(Number(e.target.value))}
          className="w-full max-w-xs accent-brand"
        />
        <div className="mt-1 flex justify-between text-xs text-muted max-w-xs">
          <span>10% (conservative)</span>
          <span>100% (full Kelly)</span>
        </div>
      </div>

      {/* Result */}
      {hasResult && (
        <div className="rounded-card border border-line bg-card p-5 shadow-card">
          {noEdge ? (
            <div className="text-center">
              <p className="font-display text-lg font-bold text-loss">No edge detected</p>
              <p className="mt-1 text-sm text-muted">
                Kelly says don&apos;t bet. Your estimated probability doesn&apos;t justify these odds.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted">Recommended stake</div>
                  <div className="font-display text-3xl font-bold text-brand">
                    {displayKelly!.toFixed(2)}%
                    {capped && <span className="ml-2 text-sm font-normal text-warning">(capped at {HARD_CAP}%)</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">Full Kelly</div>
                  <div className="font-display text-lg font-bold text-ink">
                    {(fullKelly! * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="text-xs text-muted">Edge</div>
                  <div className="font-display font-bold text-ink">
                    {((prob / 100 - 1 / decimalOdds!) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="text-xs text-muted">Implied odds</div>
                  <div className="font-display font-bold text-ink">
                    {(100 / decimalOdds!).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="text-xs text-muted">Kelly fraction</div>
                  <div className="font-display font-bold text-ink">
                    {Math.round(fraction * 100)}%
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 rounded-md border border-warning-dim bg-warning-dim/30 px-4 py-3">
            <p className="text-xs text-warning">
              <strong>Garbage in, garbage out.</strong> Kelly is only as good as your probability estimate.
              If your estimate is off, the suggested stake is wrong. Use fractional Kelly (¼–½) to reduce variance.
              This is not financial advice. 18+ — entertainment only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
