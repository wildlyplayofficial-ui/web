"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { createWatchingAction } from "@/lib/admin-actions";

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none";
const labelCls = "mb-1 block text-sm text-muted";

/** Parse /watching command format into form fields. */
function parseWatchingCommand(text: string) {
  const fields: Record<string, string> = {};
  let note: string | null = null;
  const lines = text.replace(/^\s*\/watching(@\w+)?/, "").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "note") {
      note = [m[2], ...lines.slice(i + 1)].join("\n").trim();
      break;
    }
    fields[key] = m[2].trim();
  }

  const matchStr = fields.match || "";
  const teams = matchStr.split(/\s+vs\.?\s+/i);
  const homeTeam = teams[0]?.trim() || "";
  const awayTeam = teams[1]?.trim() || "";
  const league = fields.league || "FIFA World Cup 2026";

  // Convert kickoff to datetime-local format (YYYY-MM-DDTHH:MM)
  let kickoff = "";
  if (fields.kickoff) {
    const d = new Date(fields.kickoff);
    if (!isNaN(d.getTime())) {
      kickoff = d.toISOString().slice(0, 16);
    }
  }

  return { homeTeam, awayTeam, league, kickoff, note: note || "" };
}

export default function NewWatchingPage() {
  const router = useRouter();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("FIFA World Cup 2026");
  const [kickoff, setKickoff] = useState("");
  const [note, setNote] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  function handleParse() {
    const parsed = parseWatchingCommand(pasteText);
    setHomeTeam(parsed.homeTeam);
    setAwayTeam(parsed.awayTeam);
    setLeague(parsed.league);
    setKickoff(parsed.kickoff);
    setNote(parsed.note);
    setPasteMode(false);
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await createWatchingAction(formData);
      if (result.error) return { error: result.error };
      router.push("/admin/watching");
      return { error: null };
    },
    { error: null },
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-2xl font-bold">New Watching</h1>

      {/* Toggle paste mode */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setPasteMode(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!pasteMode ? "bg-brand text-bg" : "bg-card-hover text-muted"}`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setPasteMode(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${pasteMode ? "bg-brand text-bg" : "bg-card-hover text-muted"}`}
        >
          Paste /watching
        </button>
      </div>

      {/* Paste mode */}
      {pasteMode && (
        <div className="mb-4 space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={`/watching\nmatch: Ghana vs Panama\nleague: FIFA World Cup 2026\nkickoff: 2026-06-17T23:00:00+00:00\nnote: Group L opener...`}
            className={inputCls + " font-mono text-sm"}
          />
          <button
            type="button"
            onClick={handleParse}
            className="rounded-lg bg-card-hover px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line"
          >
            Parse & Fill Form
          </button>
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="homeTeam" className={labelCls}>Home Team</label>
            <input id="homeTeam" name="homeTeam" required value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="awayTeam" className={labelCls}>Away Team</label>
            <input id="awayTeam" name="awayTeam" required value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="league" className={labelCls}>League</label>
          <input id="league" name="league" required value={league} onChange={(e) => setLeague(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label htmlFor="kickoffUtc" className={labelCls}>Kickoff (UTC)</label>
          <input id="kickoffUtc" name="kickoffUtc" type="datetime-local" required value={kickoff} onChange={(e) => setKickoff(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>Note (optional)</label>
          <textarea id="note" name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Missing Yamal, line moving..." className={inputCls} />
        </div>

        {state.error && <p className="text-sm text-loss">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create Watching"}
        </button>
      </form>
    </div>
  );
}
