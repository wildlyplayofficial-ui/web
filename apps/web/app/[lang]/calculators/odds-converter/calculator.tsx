"use client";

import { useState } from "react";

type OddsFormat = "decimal" | "fractional" | "american" | "malay" | "hk" | "indo" | "implied";

const formatLabels: Record<OddsFormat, string> = {
  decimal: "Decimal",
  fractional: "Fractional",
  american: "American",
  malay: "Malay",
  hk: "Hong Kong",
  indo: "Indonesian",
  implied: "Implied %",
};

/** All conversions go through implied probability as the canonical form. */

function toImplied(format: OddsFormat, raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;

  switch (format) {
    case "decimal": {
      const d = Number(v);
      return d > 1 ? 1 / d : null;
    }
    case "fractional": {
      const parts = v.split("/");
      if (parts.length !== 2) return null;
      const num = Number(parts[0]);
      const den = Number(parts[1]);
      if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0 || num < 0) return null;
      return den / (num + den);
    }
    case "american": {
      const a = Number(v);
      if (!Number.isFinite(a) || a === 0) return null;
      if (a > 0) return 100 / (a + 100);
      return Math.abs(a) / (Math.abs(a) + 100);
    }
    case "malay": {
      const m = Number(v);
      if (!Number.isFinite(m)) return null;
      if (m >= 0 && m <= 1) return 1 / (1 + m);
      if (m < 0 && m >= -1) return Math.abs(m) / (1 + Math.abs(m));
      return null;
    }
    case "hk": {
      const h = Number(v);
      if (!Number.isFinite(h) || h < 0) return null;
      return 1 / (h + 1);
    }
    case "indo": {
      const n = Number(v);
      if (!Number.isFinite(n) || n === 0) return null;
      if (n > 0) return 1 / (n + 1);
      return Math.abs(n) / (Math.abs(n) + 1);
    }
    case "implied": {
      const p = Number(v);
      if (!Number.isFinite(p) || p <= 0 || p >= 100) return null;
      return p / 100;
    }
    default:
      return null;
  }
}

function fromImplied(format: OddsFormat, p: number): string {
  if (p <= 0 || p >= 1) return "—";

  switch (format) {
    case "decimal":
      return (1 / p).toFixed(4);
    case "fractional": {
      const dec = 1 / p;
      const profit = dec - 1;
      // find clean fraction
      for (const den of [1, 2, 4, 5, 8, 10, 20, 25, 50, 100]) {
        const num = profit * den;
        if (Math.abs(num - Math.round(num)) < 0.01) {
          return `${Math.round(num)}/${den}`;
        }
      }
      return `${profit.toFixed(2)}/1`;
    }
    case "american": {
      if (p >= 0.5) return Math.round(-100 * p / (1 - p)).toString();
      return `+${Math.round(100 * (1 - p) / p)}`;
    }
    case "malay": {
      if (p <= 0.5) return (1 / p - 1).toFixed(4);
      return (-(p / (1 - p))).toFixed(4);
    }
    case "hk":
      return (1 / p - 1).toFixed(4);
    case "indo": {
      if (p <= 0.5) return (1 / p - 1).toFixed(4);
      return (-p / (1 - p)).toFixed(4);
    }
    case "implied":
      return (p * 100).toFixed(2);
    default:
      return "—";
  }
}

const allFormats: OddsFormat[] = ["decimal", "fractional", "american", "malay", "hk", "indo", "implied"];

export function OddsConverter() {
  const [inputFormat, setInputFormat] = useState<OddsFormat>("american");
  const [inputValue, setInputValue] = useState("");

  const implied = toImplied(inputFormat, inputValue);

  return (
    <div className="mt-8 space-y-6">
      {/* Input format selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Input format</label>
        <div className="flex flex-wrap gap-2">
          {allFormats.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setInputFormat(f); setInputValue(""); }}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                inputFormat === f
                  ? "border-brand bg-brand-dim text-brand"
                  : "border-line text-muted hover:border-line-hover hover:text-ink"
              }`}
            >
              {formatLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          Enter {formatLabels[inputFormat]} odds
        </label>
        <input
          type="text"
          inputMode={inputFormat === "fractional" ? "text" : "numeric"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            inputFormat === "american" ? "-110"
              : inputFormat === "decimal" ? "1.91"
              : inputFormat === "fractional" ? "10/11"
              : inputFormat === "malay" ? "0.91"
              : inputFormat === "hk" ? "0.91"
              : inputFormat === "indo" ? "-1.10"
              : "52.38"
          }
          className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Results */}
      {implied !== null && (
        <div className="rounded-card border border-line bg-card p-5 shadow-card">
          <div className="space-y-2">
            {allFormats.map((f) => {
              const val = fromImplied(f, implied);
              const isSource = f === inputFormat;
              return (
                <div
                  key={f}
                  className={`flex items-center justify-between rounded-md px-4 py-3 ${
                    isSource ? "bg-brand-dim" : "bg-bg"
                  }`}
                >
                  <span className="text-sm font-medium text-muted">{formatLabels[f]}</span>
                  <span className={`font-display text-lg font-bold ${isSource ? "text-brand" : "text-ink"}`}>
                    {f === "implied" ? `${val}%` : val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
