"use client";

import { useMemo } from "react";
import Link from "next/link";
import { teamFlag } from "@/lib/flags";
import { withLang, type Lang } from "@/lib/i18n";
import { MatchStatus } from "./match-status";
import { locales } from "@/lib/format";

interface MatchEntry {
  slug: string;
  kickoffUtc: string;
  homeScore: number | null;
  awayScore: number | null;
  pickStatus: string | null;
  liveStatus: "live" | "ft" | null;
  minute: string | null;
  league: string;
  homeName: string;
  awayName: string;
}

function localDate(utc: string): string {
  const d = new Date(utc);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(iso: string, lang: Lang): string {
  const d = new Date(iso + "T12:00:00");
  const today = localDate(new Date().toISOString());
  const tomorrow = localDate(new Date(Date.now() + 86_400_000).toISOString());
  if (iso === today) return lang === "vi" ? "Hôm nay" : lang === "th" ? "วันนี้" : lang === "es" ? "Hoy" : "Today";
  if (iso === tomorrow) return lang === "vi" ? "Ngày mai" : lang === "th" ? "พรุ่งนี้" : lang === "es" ? "Mañana" : "Tomorrow";
  return new Intl.DateTimeFormat(locales[lang], { weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function MatchDateGroups({
  matches,
  lang,
}: {
  matches: MatchEntry[];
  lang: Lang;
}) {
  const dateGroups = useMemo(() => {
    const groups: { date: string; matches: MatchEntry[] }[] = [];
    for (const m of matches) {
      const ld = localDate(m.kickoffUtc);
      const last = groups[groups.length - 1];
      if (last && last.date === ld) {
        last.matches.push(m);
      } else {
        groups.push({ date: ld, matches: [m] });
      }
    }
    return groups;
  }, [matches]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      {dateGroups.map((group) => (
        <div key={group.date}>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {formatDateHeader(group.date, lang)}
          </h2>
          <div className="flex flex-col gap-2">
            {group.matches.map((m) => {
              const hf = teamFlag(m.homeName);
              const af = teamFlag(m.awayName);
              const showScore = m.liveStatus === "ft" || m.liveStatus === "live";
              return (
                <Link
                  key={m.slug}
                  href={withLang(`/match/${m.slug}`, lang)}
                  className="group rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <MatchStatus kickoffUtc={m.kickoffUtc} liveStatus={m.liveStatus} minute={m.minute} />
                    </div>
                    {m.league && (
                      <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted">
                        {m.league}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                      <span className="text-base">{hf && <span className="mr-1.5">{hf}</span>}{m.homeName}</span>
                      {showScore && m.homeScore !== null && <span className="text-base tabular-nums">{m.homeScore}</span>}
                    </div>
                    <div className="flex items-center justify-between font-display font-bold leading-snug transition-colors group-hover:text-brand">
                      <span className="text-base">{af && <span className="mr-1.5">{af}</span>}{m.awayName}</span>
                      {showScore && m.awayScore !== null && <span className="text-base tabular-nums">{m.awayScore}</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-end">
                    {m.pickStatus === "won" && <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Won</span>}
                    {m.pickStatus === "lost" && <span className="rounded-md bg-loss/10 px-2 py-0.5 text-xs font-semibold text-loss">Lost</span>}
                    {m.pickStatus === "push" && <span className="rounded-md bg-muted/10 px-2 py-0.5 text-xs font-semibold text-muted">Push</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
