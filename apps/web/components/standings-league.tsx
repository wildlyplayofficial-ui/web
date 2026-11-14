"use client";

import { useState } from "react";
import type { StandingTeam } from "@/lib/standings";
import { TeamCrest } from "@/components/team-crest";

type Tab = "all" | "home" | "away" | "form";

export interface TabLabels { all: string; home: string; away: string }
const NHAN_TAB: TabLabels = { all: "All", home: "Home", away: "Away" };

const formBadge: Record<string, { bg: string; text: string }> = {
  W: { bg: "bg-brand", text: "text-bg" },
  D: { bg: "bg-muted/30", text: "text-ink" },
  L: { bg: "bg-loss", text: "text-bg" },
};

function FormBadges({ form }: { form: string }) {
  if (!form) return <span className="text-muted">—</span>;
  return (
    <div className="flex items-center justify-end gap-1">
      {form.split("").map((ch, i) => {
        const style = formBadge[ch.toUpperCase()] ?? formBadge.D;
        return (
          <span
            key={i}
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}
          >
            {ch.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

/** EPL zone highlights: top 4 CL, 5th EL, bottom 3 relegation. */
function zoneClass(rank: number, total: number): string {
  if (rank <= 4) return "border-l-2 border-l-brand"; // Champions League
  if (rank === 5) return "border-l-2 border-l-indigo-soft"; // Europa League
  if (rank > total - 3) return "border-l-2 border-l-loss"; // Relegation
  return "";
}

interface Labels {
  team: string;
  mp: string;
  w: string;
  d: string;
  l: string;
  gf: string;
  ga: string;
  gd: string;
  pts: string;
  form: string;
}

export function LeagueTable({
  teams,
  labels,
  showQualification = true,
  sanNha,
  sanKhach,
  tabLabels = NHAN_TAB,
}: {
  teams: StandingTeam[];
  labels: Labels;
  // European CL/EL/relegation zones apply to the top-5 European leagues only.
  // North-American leagues (MLS, Liga MX) use playoffs, not European cups, so
  // the caller passes false to hide the misleading legend + row highlights.
  showQualification?: boolean;
  /** Bảng tách sân (lib/bxh-san.ts). Thiếu một trong hai → ẩn tab sân nhà/khách. */
  sanNha?: StandingTeam[];
  sanKhach?: StandingTeam[];
  tabLabels?: TabLabels;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const coSan = !!sanNha?.length && !!sanKhach?.length;
  const dong = tab === "home" ? (sanNha ?? teams) : tab === "away" ? (sanKhach ?? teams) : teams;
  const bangDay = tab !== "form";
  const tabs: Array<[Tab, string]> = [["all", tabLabels.all], ...(coSan ? ([["home", tabLabels.home], ["away", tabLabels.away]] as Array<[Tab, string]>) : []), ["form", labels.form]];

  return (
    <section>
      <div className="mb-2 flex items-center justify-end">
        <div className="flex gap-1 rounded-lg bg-card p-1">
          {tabs.map(([k, ten]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`rounded-md px-2.5 py-1 font-display text-xs font-semibold uppercase transition-colors ${
                tab === k ? "bg-brand text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {ten}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="px-2 py-2 font-medium">{labels.team}</th>
              {bangDay ? (
                <>
                  <th className="px-1.5 py-2 text-center font-medium">{labels.mp}</th>
                  <th className="px-1.5 py-2 text-center font-medium">{labels.w}</th>
                  <th className="px-1.5 py-2 text-center font-medium">{labels.d}</th>
                  <th className="px-1.5 py-2 text-center font-medium">{labels.l}</th>
                  <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{labels.gf}</th>
                  <th className="hidden px-1.5 py-2 text-center font-medium sm:table-cell">{labels.ga}</th>
                  <th className="px-1.5 py-2 text-center font-medium">{labels.gd}</th>
                  <th className="px-2 py-2 text-center font-semibold">{labels.pts}</th>
                </>
              ) : (
                <th className="px-2 py-2 text-right font-medium">{labels.form}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {dong.map((team) => (
              <tr
                key={team.name}
                className={`border-b border-line last:border-0 ${showQualification && tab === "all" ? zoneClass(team.rank, teams.length) : ""}`}
              >
                <td className="px-2 py-2 text-center text-muted">{team.rank}</td>
                <td className="px-2 py-2 font-medium text-ink">
                  <TeamCrest name={team.name} />
                  {team.name}
                </td>
                {bangDay ? (
                  <>
                    <td className="px-1.5 py-2 text-center text-muted">{team.played}</td>
                    <td className="px-1.5 py-2 text-center text-muted">{team.won}</td>
                    <td className="px-1.5 py-2 text-center text-muted">{team.drawn}</td>
                    <td className="px-1.5 py-2 text-center text-muted">{team.lost}</td>
                    <td className="hidden px-1.5 py-2 text-center text-muted sm:table-cell">{team.goals_for}</td>
                    <td className="hidden px-1.5 py-2 text-center text-muted sm:table-cell">{team.goals_against}</td>
                    <td className="px-1.5 py-2 text-center text-ink">
                      {team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}
                    </td>
                    <td className="px-2 py-2 text-center font-display font-bold text-ink">{team.points}</td>
                  </>
                ) : (
                  <td className="px-2 py-2 text-right">
                    <FormBadges form={team.form} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showQualification && tab === "all" && (
        <div className="mt-2 flex gap-4 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-6 rounded border-l-2 border-l-brand" /> Champions League
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-6 rounded border-l-2 border-l-indigo-soft" /> Europa League
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-6 rounded border-l-2 border-l-loss" /> Relegation
          </span>
        </div>
      )}
    </section>
  );
}
