"use client";

import { useState, useCallback } from "react";
import { createCard } from "@/lib/card-actions";
import { S } from "@/lib/strings";

type FormState = "idle" | "submitting" | "success" | "error";

export function AdminCreateForm() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [matchId1, setMatchId1] = useState("");
  const [matchId2, setMatchId2] = useState("");
  const [matchId3, setMatchId3] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const ids = [matchId1.trim(), matchId2.trim(), matchId3.trim()];
      if (ids.some((id) => !id)) {
        setMessage("All 3 match IDs are required");
        setState("error");
        return;
      }

      setState("submitting");
      setMessage("");

      const result = await createCard(date, ids);
      if (result.error) {
        setMessage(result.error);
        setState("error");
      } else {
        setMessage(`Card created: ${result.cardId}`);
        setState("success");
        setMatchId1("");
        setMatchId2("");
        setMatchId3("");
      }
    },
    [date, matchId1, matchId2, matchId3],
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      {/* Date */}
      <div>
        <label htmlFor="card-date" className="block text-sm text-muted">
          {S.DATE_LABEL}
        </label>
        <input
          id="card-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </div>

      {/* Match IDs */}
      <fieldset>
        <legend className="text-sm text-muted">
          {S.MATCH_IDS_LABEL}
        </legend>
        <div className="mt-1 space-y-2">
          {[
            { value: matchId1, setter: setMatchId1, label: "Match 1" },
            { value: matchId2, setter: setMatchId2, label: "Match 2" },
            { value: matchId3, setter: setMatchId3, label: "Match 3" },
          ].map(({ value, setter, label }) => (
            <input
              key={label}
              type="text"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={label}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none"
            />
          ))}
        </div>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {state === "submitting" ? "Creating..." : S.CREATE_CARD}
      </button>

      {/* Feedback */}
      {message && (
        <p
          className={`text-sm ${state === "error" ? "text-loss" : "text-brand"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
