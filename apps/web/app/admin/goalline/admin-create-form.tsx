"use client";

import { useState, useCallback } from "react";
import { createCardManual } from "@/lib/goalline/card-actions";
import { S } from "@/lib/goalline/strings";
import { MatchPicker, type MatchOption } from "./match-picker";

type FormState = "idle" | "submitting" | "success" | "error";

export function AdminCreateForm() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<MatchOption[]>([]);
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [goalLine, setGoalLine] = useState("7.5");
  const [overOdds, setOverOdds] = useState("2.00");
  const [underOdds, setUnderOdds] = useState("1.85");
  const [deriving, setDeriving] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (selected.length !== 3) {
        setMessage("Select exactly 3 matches");
        setState("error");
        return;
      }
      setState("submitting");
      setMessage("");

      const result = await createCardManual(
        date,
        selected.map((m) => ({ id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, kickoffUtc: m.kickoffUtc })),
        parseFloat(goalLine),
        parseFloat(overOdds),
        parseFloat(underOdds),
      );

      if (result.error) {
        setMessage(result.error);
        setState("error");
      } else {
        setMessage(`Card created: ${result.cardId}`);
        setState("success");
        setSelected([]);
      }
    },
    [date, selected, goalLine, overOdds, underOdds],
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      <div>
        <label htmlFor="card-date" className="block text-sm text-muted">{S.DATE_LABEL}</label>
        <input
          id="card-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="text-sm text-muted">{S.MATCH_IDS_LABEL}</legend>
        <div className="mt-2">
          <MatchPicker onChange={setSelected} dateFilter={date} />
        </div>
      </fieldset>

      <div className="space-y-3 rounded-lg border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted">Goal Line + Odds</p>
          <button
            type="button"
            disabled={selected.length !== 3 || deriving}
            onClick={async () => {
              setDeriving(true);
              setMessage("");
              try {
                const res = await fetch("/api/goalline/derive", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ matches: selected.map((m) => ({ id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, kickoffUtc: m.kickoffUtc })) }),
                });
                const data = await res.json();
                if (data.error) {
                  setMessage(`Derive: ${data.error} — enter manually`);
                } else {
                  setGoalLine(String(data.goalLine));
                  setOverOdds(String(data.overOdds));
                  setUnderOdds(String(data.underOdds));
                  setMessage(`Derived: Line ${data.goalLine}, Over ${data.overOdds}, Under ${data.underOdds}`);
                }
              } catch {
                setMessage("Derive failed — enter manually");
              }
              setDeriving(false);
            }}
            className="rounded-md border border-brand px-3 py-1 text-xs font-medium text-brand transition hover:bg-brand-dim disabled:opacity-40"
          >
            {deriving ? "Deriving..." : "Auto Derive"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="goal-line" className="block text-xs text-muted">Goal Line</label>
            <input id="goal-line" type="number" step="0.5" value={goalLine}
              onChange={(e) => setGoalLine(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
          </div>
          <div>
            <label htmlFor="over-odds" className="block text-xs text-muted">Over Odds</label>
            <input id="over-odds" type="number" step="0.01" value={overOdds}
              onChange={(e) => setOverOdds(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
          </div>
          <div>
            <label htmlFor="under-odds" className="block text-xs text-muted">Under Odds</label>
            <input id="under-odds" type="number" step="0.01" value={underOdds}
              onChange={(e) => setUnderOdds(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={state === "submitting" || selected.length !== 3}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50">
        {state === "submitting" ? "Creating..." : S.CREATE_CARD}
      </button>

      {message && (
        <p className={`text-sm ${state === "error" ? "text-loss" : "text-brand"}`}>{message}</p>
      )}
    </form>
  );
}
