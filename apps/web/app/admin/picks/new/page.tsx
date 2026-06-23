"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPickAction } from "@/lib/admin-actions";

const MARKETS = [
  { value: "ah", label: "Asian Handicap" },
  { value: "ou", label: "Over/Under" },
  { value: "1x2", label: "1X2" },
  { value: "btts", label: "BTTS" },
  { value: "other", label: "Special" },
] as const;

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-brand focus:outline-none";
const labelCls = "mb-1 block text-sm text-muted";

/** Parse /pick command format into form fields. */
function parsePickCommand(text: string) {
  const fields: Record<string, string> = {};
  let thesis: string | null = null;
  const lines = text.replace(/^\s*\/pick(@\w+)?/, "").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "thesis") {
      thesis = [m[2], ...lines.slice(i + 1)].join("\n").trim();
      break;
    }
    fields[key] = m[2].trim();
  }

  const matchStr = fields.match || "";
  const teams = matchStr.split(/\s+vs\.?\s+/i);

  let kickoff = "";
  if (fields.kickoff) {
    const d = new Date(fields.kickoff);
    if (!isNaN(d.getTime())) kickoff = d.toISOString().slice(0, 16);
  }

  return {
    homeTeam: teams[0]?.trim() || "",
    awayTeam: teams[1]?.trim() || "",
    league: fields.league || "",
    kickoff,
    market: fields.market?.toLowerCase() || "ah",
    selection: fields.selection || "",
    line: fields.line || "",
    odds: fields.odds || "",
    stake: fields.stake || "1",
    thesis: thesis || "",
  };
}

export default function NewPickPage() {
  const router = useRouter();
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [market, setMarket] = useState("ah");
  const [selection, setSelection] = useState("");
  const [line, setLine] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("1");
  const [thesis, setThesis] = useState("");

  function handleParse() {
    const p = parsePickCommand(pasteText);
    setHomeTeam(p.homeTeam);
    setAwayTeam(p.awayTeam);
    setLeague(p.league);
    setKickoff(p.kickoff);
    setMarket(p.market);
    setSelection(p.selection);
    setLine(p.line);
    setOdds(p.odds);
    setStake(p.stake);
    setThesis(p.thesis);
    setPasteMode(false);
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const result = await createPickAction(formData);
      if (result.error) return { error: result.error };
      router.push("/admin/picks");
      return { error: null };
    },
    { error: null },
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-2xl font-bold">New Pick</h1>

      {/* Toggle */}
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setPasteMode(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!pasteMode ? "bg-brand text-bg" : "bg-card-hover text-muted"}`}>
          Manual
        </button>
        <button type="button" onClick={() => setPasteMode(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${pasteMode ? "bg-brand text-bg" : "bg-card-hover text-muted"}`}>
          Paste /pick
        </button>
      </div>

      {pasteMode && (
        <div className="mb-4 space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder={`/pick\nmatch: Spain vs Cape Verde\nleague: FIFA World Cup 2026\nkickoff: 2026-06-15T16:00:00+00:00\nmarket: ou\nselection: Under 3.5\nline: 3.5\nodds: 2.06\nstake: 0.25\nthesis: Spain confirmed without...`}
            className={inputCls + " font-mono text-sm"}
          />
          <button type="button" onClick={handleParse}
            className="rounded-lg bg-card-hover px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line">
            Parse & Fill Form
          </button>
        </div>
      )}

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="market" className={labelCls}>Market</label>
            <select id="market" name="market" required value={market} onChange={(e) => setMarket(e.target.value)} className={inputCls}>
              {MARKETS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="selection" className={labelCls}>Selection</label>
            <input id="selection" name="selection" required value={selection} onChange={(e) => setSelection(e.target.value)} placeholder="Home -0.5" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="line" className={labelCls}>Line</label>
            <input id="line" name="line" type="number" step="0.25" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label htmlFor="odds" className={labelCls}>Odds</label>
            <input id="odds" name="odds" type="number" step="0.01" min="1.01" max="100" required value={odds} onChange={(e) => setOdds(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="stake" className={labelCls}>Stake (units)</label>
            <input id="stake" name="stake" type="number" step="0.25" min="0.25" max="5" required value={stake} onChange={(e) => setStake(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="thesis" className={labelCls}>Thesis</label>
          <textarea id="thesis" name="thesis" rows={4} required value={thesis} onChange={(e) => setThesis(e.target.value)} className={inputCls} />
        </div>

        {state.error && <p className="text-sm text-loss">{state.error}</p>}

        <button type="submit" disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
          {pending ? "Creating..." : "Create Pick"}
        </button>
      </form>
    </div>
  );
}
