"use client";

import { useEffect, useState } from "react";
import { TeamCrest } from "@/components/team-crest";

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
    <div
      className="border-b border-brand/40 bg-brand-dim"
      role="status"
      aria-live="polite"
      aria-label="Live scores"
    >
      <div
        className="mx-auto flex max-w-[1100px] items-center gap-5 overflow-x-auto px-5 py-2"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Nhãn LIVE bằng chữ, không để mỗi chấm nhấp nháy — chấm không đọc được
            bằng trình đọc màn hình và cũng khó hiểu với người mới vào. */}
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-bg">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bg opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bg" />
          </span>
          Live
        </span>
        {matches.map((m) => (
          <TickerItem key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ match }: { match: TickerMatch }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-sm">
      <span className="font-display font-semibold text-ink">
        {/* Crest CLB (teamBadge theo tên) → cờ quốc gia → không có, tự xuống hạng.
            Trước chỉ có cờ nên trận CLB như Atlas-Tigres trống logo (Peter 16/8). */}
        <TeamCrest name={match.homeTeam} />
        {shortName(match.homeTeam)}
      </span>
      <span className="rounded bg-brand/15 px-1.5 py-0.5 font-display font-bold text-brand tabular-nums">
        {match.homeScore ?? 0}&ndash;{match.awayScore ?? 0}
      </span>
      <span className="font-display font-semibold text-ink">
        <TeamCrest name={match.awayTeam} />
        {shortName(match.awayTeam)}
      </span>
      {match.minute != null && (
        <span className="text-xs font-semibold text-muted tabular-nums">{match.minute}&apos;</span>
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
