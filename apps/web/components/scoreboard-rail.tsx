import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { buildMatchSlug } from "@/lib/data";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "@/components/local-kickoff-time";
import { COMPETITION_LOGOS } from "@/lib/competition-logos";
import { ScrollRow } from "@/components/scroll-row";
import type { StripMatch } from "@/components/home-next-matches";

/* eslint-disable @next/next/no-img-element */

/**
 * Top scoreboard rail — the ESPN-style strip that sits under the header, above
 * the hero. Full-bleed row of compact match cards: recently-finished scores +
 * near-upcoming kickoffs across every competition. Distinct from LiveTicker
 * (live-only headline scores): this is the always-on scores & fixtures strip.
 *
 * Reuses the SAME `stripMatches` the homepage feeds to HomeNextMatches — no
 * extra fetch — so the two stay in lockstep.
 */
export function ScoreboardRail({
  matches,
  lang,
  labels,
}: {
  matches: StripMatch[];
  lang: Lang;
  labels: { title: string; finished: string };
}) {
  if (matches.length === 0) return null;

  // Thẻ đầu tiên CHƯA đá — băng cuộn tới đúng chỗ này khi mở trang (Nick 29/8).
  // Trận đã KT vẫn giữ, chỉ nằm bên trái. Không có trận nào chưa đá thì không neo,
  // băng đứng ở đầu như cũ.
  const neoTaiId = matches.find((m) => !m.finished)?.id ?? null;

  return (
    <div className="border-b border-line bg-card" aria-label={labels.title}>
      <div className="mx-auto max-w-[1100px] px-5 py-2.5">
        <ScrollRow className="flex items-stretch gap-2">
          <span className="flex shrink-0 items-center pr-1 font-display text-[11px] font-bold uppercase tracking-wide text-muted">
            {labels.title}
          </span>
          {matches.map((m) => {
            const href = m.time
              ? withLang(
                  `/match/${buildMatchSlug(m.homeName, m.awayName, `${m.date}T${m.time}:00Z`)}`,
                  lang,
                )
              : null;
            const status = m.finished ? (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-brand">
                {labels.finished}
              </span>
            ) : !m.time || m.provisional ? (
              <span className="text-[10px] tabular-nums text-muted">--:--</span>
            ) : (
              <LocalKickoffTime iso={`${m.date}T${m.time}:00Z`} className="text-[10px] tabular-nums text-muted" />
            );
            const body = (
              <>
                <div className="flex items-center gap-1">
                  {COMPETITION_LOGOS[m.compSlug] && (
                    <img
                      src={COMPETITION_LOGOS[m.compSlug]}
                      alt=""
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 object-contain"
                    />
                  )}
                  <span className="truncate text-[10px] text-muted">{m.compName}</span>
                  <span className="ml-auto shrink-0 pl-1">{status}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <TeamCrest name={m.homeName} />
                  <span className="flex-1 truncate">{m.homeName}</span>
                  {m.finished && (
                    <span className="font-display font-bold tabular-nums">{m.homeScore ?? 0}</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                  <TeamCrest name={m.awayName} />
                  <span className="flex-1 truncate">{m.awayName}</span>
                  {m.finished && (
                    <span className="font-display font-bold tabular-nums">{m.awayScore ?? 0}</span>
                  )}
                </div>
              </>
            );
            const cls =
              "flex w-[168px] shrink-0 flex-col rounded-md border border-line bg-bg px-2.5 py-1.5 transition-colors";
            const neo = m.id === neoTaiId ? { "data-neo": "" } : {};
            return href ? (
              <Link
                key={`${m.compSlug}-${m.id}`}
                href={href}
                className={`${cls} hover:border-line-hover hover:bg-card-hover`}
                {...neo}
              >
                {body}
              </Link>
            ) : (
              <div key={`${m.compSlug}-${m.id}`} className={cls} {...neo}>
                {body}
              </div>
            );
          })}
        </ScrollRow>
      </div>
    </div>
  );
}
