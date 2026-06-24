"use client";

import { useEffect, useState } from "react";
import { teamFlag } from "@/lib/flags";

interface TickerMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
}

const POLL_INTERVAL = 30_000;

/** Horizontal scrolling ticker of live scores. Hidden when no matches are live. */
export function LiveTicker() {
  const [matches, setMatches] = useState<TickerMatch[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const res = await fetch("/api/matches?live=1");
        if (!res.ok) return;
        const json = await res.json();
        const data = (json.matches || json) as TickerMatch[];
        if (!cancelled) setMatches(data);
      } catch {
        // Silently degrade — ticker hidden.
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="border-b border-line bg-card/60 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-[1100px] items-center gap-6 overflow-x-auto px-5 py-1.5"
        style={{ scrollbarWidth: "none" }}
      >
        <span className="relative mr-1 flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        {matches.map((m) => (
          <TickerItem key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ match }: { match: TickerMatch }) {
  const hf = teamFlag(match.homeTeam);
  const af = teamFlag(match.awayTeam);

  return (
    <span className="flex shrink-0 items-center gap-2 text-xs">
      <span className="font-display font-semibold">
        {hf && <span className="mr-0.5">{hf}</span>}
        {shortName(match.homeTeam)}
      </span>
      <span className="font-display font-bold text-brand tabular-nums">
        {match.homeScore ?? 0} - {match.awayScore ?? 0}
      </span>
      <span className="font-display font-semibold">
        {af && <span className="mr-0.5">{af}</span>}
        {shortName(match.awayTeam)}
      </span>
      {match.minute != null && (
        <span className="text-muted">{match.minute}&apos;</span>
      )}
    </span>
  );
}

/** Shorten ALL WC team names to 3-letter codes for compact mobile ticker. */
function shortName(name: string): string {
  const map: Record<string, string> = {
    "Argentina": "ARG", "Algeria": "ALG", "Australia": "AUS", "Austria": "AUT",
    "Belgium": "BEL", "Bolivia": "BOL", "Bosnia and Herzegovina": "BIH", "Brazil": "BRA",
    "Cameroon": "CMR", "Canada": "CAN", "Cape Verde": "CPV", "Chile": "CHI",
    "Colombia": "COL", "Congo DR": "COD", "DR Congo": "COD", "Costa Rica": "CRC",
    "Croatia": "CRO", "Curacao": "CUW", "Czech Republic": "CZE", "Czechia": "CZE",
    "Denmark": "DEN", "Ecuador": "ECU", "Egypt": "EGY", "England": "ENG",
    "France": "FRA", "Germany": "GER", "Ghana": "GHA", "Haiti": "HAI",
    "Iran": "IRN", "Iraq": "IRQ", "Israel": "ISR", "Italy": "ITA",
    "Ivory Coast": "CIV", "Japan": "JPN", "Jordan": "JOR", "Mexico": "MEX",
    "Morocco": "MAR", "Netherlands": "NED", "New Zealand": "NZL", "Nigeria": "NGA",
    "North Macedonia": "MKD", "Norway": "NOR", "Panama": "PAN", "Paraguay": "PAR",
    "Peru": "PER", "Poland": "POL", "Portugal": "POR", "Qatar": "QAT",
    "Republic of Ireland": "IRL", "Saudi Arabia": "KSA", "Scotland": "SCO",
    "Senegal": "SEN", "Serbia": "SRB", "South Africa": "RSA", "South Korea": "KOR",
    "Spain": "ESP", "Sweden": "SWE", "Switzerland": "SUI", "Tunisia": "TUN",
    "Turkey": "TUR", "Turkiye": "TUR", "United States": "USA", "Uruguay": "URU",
    "Uzbekistan": "UZB",
  };
  return map[name] ?? name;
}
