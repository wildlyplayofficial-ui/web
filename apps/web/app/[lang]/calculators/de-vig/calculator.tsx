"use client";

import { useState } from "react";

type Method = "multiplicative" | "additive" | "shin" | "power";

function parseAmericanToDecimal(input: string): number | null {
  const n = Number(input);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n > 0) return n / 100 + 1;
  return 100 / Math.abs(n) + 1;
}

function decimalToImplied(dec: number): number {
  return 1 / dec;
}

function impliedToAmerican(p: number): string {
  if (p >= 0.5) return Math.round(-100 * p / (1 - p)).toString();
  return `+${Math.round(100 * (1 - p) / p)}`;
}

function deVigMultiplicative(probs: number[]): number[] {
  const total = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / total);
}

function deVigAdditive(probs: number[]): number[] {
  const total = probs.reduce((a, b) => a + b, 0);
  const margin = total - 1;
  const share = margin / probs.length;
  return probs.map((p) => Math.max(0.001, p - share));
}

function deVigShin(probs: number[]): number[] {
  const n = probs.length;
  const total = probs.reduce((a, b) => a + b, 0);
  const z = (total - 1) / n;
  return probs.map((p) => {
    const disc = p * p - 4 * z * p;
    if (disc < 0) return p / total; // fallback
    return (p - Math.sqrt(disc)) / (2 * z);
  });
}

function deVigPower(probs: number[]): number[] {
  let lo = 0.5;
  let hi = 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const sum = probs.reduce((a, p) => a + Math.pow(p, mid), 0);
    if (sum > 1) lo = mid;
    else hi = mid;
  }
  const k = (lo + hi) / 2;
  return probs.map((p) => Math.pow(p, k));
}

const methods: Record<Method, (probs: number[]) => number[]> = {
  multiplicative: deVigMultiplicative,
  additive: deVigAdditive,
  shin: deVigShin,
  power: deVigPower,
};

const methodLabels: Record<Method, string> = {
  multiplicative: "Multiplicative",
  additive: "Additive",
  shin: "Shin",
  power: "Power",
};

export function DeVigCalculator() {
  const [format, setFormat] = useState<"american" | "decimal">("american");
  const [way, setWay] = useState<2 | 3>(2);
  const [inputs, setInputs] = useState(["", "", ""]);
  const [method, setMethod] = useState<Method>("multiplicative");

  const activeInputs = inputs.slice(0, way);

  const parsed = activeInputs.map((v) => {
    if (!v.trim()) return null;
    if (format === "american") {
      const dec = parseAmericanToDecimal(v);
      return dec ? decimalToImplied(dec) : null;
    }
    const dec = Number(v);
    return dec > 1 ? decimalToImplied(dec) : null;
  });

  const allValid = parsed.every((p) => p !== null);
  const impliedProbs = parsed as number[];
  const totalJuice = allValid ? impliedProbs.reduce((a, b) => a + b, 0) : 0;
  const margin = allValid ? ((totalJuice - 1) * 100).toFixed(2) : null;

  const fair = allValid ? methods[method](impliedProbs) : null;

  const labels = way === 2 ? ["Side 1", "Side 2"] : ["1", "X", "2"];

  function setInput(i: number, val: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-card p-1">
          <button
            type="button"
            onClick={() => setWay(2)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${way === 2 ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
          >
            2-Way
          </button>
          <button
            type="button"
            onClick={() => setWay(3)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${way === 3 ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
          >
            3-Way
          </button>
        </div>
        <div className="flex rounded-lg bg-card p-1">
          <button
            type="button"
            onClick={() => setFormat("american")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${format === "american" ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
          >
            American
          </button>
          <button
            type="button"
            onClick={() => setFormat("decimal")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${format === "decimal" ? "bg-brand text-bg" : "text-muted hover:text-ink"}`}
          >
            Decimal
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${way}, 1fr)` }}>
        {labels.slice(0, way).map((label, i) => (
          <div key={label}>
            <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
            <input
              type="text"
              inputMode="numeric"
              value={inputs[i]}
              onChange={(e) => setInput(i, e.target.value)}
              placeholder={format === "american" ? "-110" : "1.91"}
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        ))}
      </div>

      {/* Method selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Method</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(methods) as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                method === m
                  ? "border-brand bg-brand-dim text-brand"
                  : "border-line text-muted hover:border-line-hover hover:text-ink"
              }`}
            >
              {methodLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {allValid && fair && margin && (
        <div className="rounded-card border border-line bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Margin (juice)</span>
            <span className="font-display text-lg font-bold text-ink">{margin}%</span>
          </div>
          <div className="space-y-3">
            {fair.slice(0, way).map((p, i) => (
              <div key={labels[i]} className="flex items-center justify-between rounded-md bg-bg px-4 py-3">
                <span className="text-sm font-medium text-ink">{labels[i]}</span>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-muted">Fair prob</div>
                    <div className="font-display font-bold text-brand">{(p * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">No-vig line</div>
                    <div className="font-display font-bold text-ink">
                      {format === "american"
                        ? impliedToAmerican(p)
                        : (1 / p).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Method: {methodLabels[method]}. Fair odds assume no margin.
          </p>
        </div>
      )}
    </div>
  );
}
