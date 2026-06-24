"use client";

import { useState } from "react";
import type { StandingTeam } from "@/lib/standings";
import { teamFlag } from "@/lib/flags";

type Tab = "all" | "form";

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

/** Derive form from W/D/L counts when API doesn't provide match-level sequence.
 *  Renders individual circles (W W D) — same style as real form badges.
 *  Order is W then D then L (not chronological, but visually consistent). */
function FormTally({ won, drawn, lost }: { won: number; drawn: number; lost: number }) {
  if (won + drawn + lost === 0) return <span className="text-muted">—</span>;
  const badges: string[] = [
    ...Array(won).fill("W"),
    ...Array(drawn).fill("D"),
    ...Array(lost).fill("L"),
  ];
  return <FormBadges form={badges.join("")} />;
}

export function GroupTableWithTabs({
  group,
  teams,
  labels,
}: {
  group: string;
  teams: StandingTeam[];
  labels: { group: string; team: string; mp: string; w: string; d: string; l: string; gf: string; ga: string; gd: string; pts: string; form: string };
}) {
  const [tab, setTab] = useState<Tab>("all");

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">
          {labels.group} {group}
        </h2>
        <div className="flex gap-1 rounded-lg bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-md px-2.5 py-1 font-display text-xs font-semibold uppercase transition-colors ${
              tab === "all" ? "bg-brand text-bg" : "text-muted hover:text-ink"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("form")}
            className={`rounded-md px-2.5 py-1 font-display text-xs font-semibold uppercase transition-colors ${
              tab === "form" ? "bg-brand text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {labels.form}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="w-8 px-2 py-2 text-center font-medium">#</th>
              <th className="px-2 py-2 font-medium">{labels.team}</th>
              {tab === "all" ? (
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
            {teams.map((team, i) => {
              const qualify = i < 2;
              const bestThird = i === 2;
              const borderClass = qualify
                ? "border-l-2 border-l-brand"
                : bestThird
                  ? "border-l-2 border-l-line"
                  : "";
              return (
                <tr
                  key={team.name}
                  className={`border-b border-line last:border-0 ${borderClass}`}
                >
                  <td className="px-2 py-2 text-center text-muted">{team.rank}</td>
                  <td className="px-2 py-2 font-medium text-ink">
                    <span className="mr-1.5">{teamFlag(team.name)}</span>
                    {team.name}
                  </td>
                  {tab === "all" ? (
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
                      {team.form ? (
                        <FormBadges form={team.form} />
                      ) : (
                        <FormTally won={team.won} drawn={team.drawn} lost={team.lost} />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
