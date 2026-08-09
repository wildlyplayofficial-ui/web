import Link from "next/link";
import type { KnockoutMatch } from "@/lib/standings";
import { withLang, type Lang } from "@/lib/i18n";
import { buildMatchSlug } from "@/lib/data";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "@/components/local-kickoff-time";
import { COMPETITION_LOGOS } from "@/lib/competition-logos";

/* eslint-disable @next/next/no-img-element */

export interface StripMatch extends KnockoutMatch {
  compSlug: string;
  compName: string;
}

/**
 * Dải trận trên trang chủ, gộp MỌI giải (Peter 8/8).
 *
 * Bản trước chỉ có Ngoại hạng Anh nên tháng 8 trang chủ trông như trang một
 * giải, dù mình có 10 giải và MLS/Liga MX đang đá thật. Trận đã đá hiện tỉ số,
 * trận chưa đá hiện giờ; mỗi thẻ đeo logo giải để biết đang xem giải nào.
 */
export function HomeNextMatches({
  matches,
  lang,
  labels,
}: {
  matches: StripMatch[];
  lang: Lang;
  labels: { title: string; all: string; finished: string; noTime: string };
}) {
  if (matches.length === 0) return null;

  return (
    <section className="pb-10">
      <div className="rounded-card border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">{labels.title}</h2>
          <Link
            href={withLang("/competitions", lang)}
            className="ml-auto text-sm font-semibold text-brand hover:underline"
          >
            {labels.all} &rarr;
          </Link>
        </div>

        {/* Cuộn ngang trong khung riêng — thân trang không được đẩy ngang theo. */}
        <div className="flex gap-3 overflow-x-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
          {matches.map((m) => {
            const href = m.time
              ? withLang(
                  `/match/${buildMatchSlug(m.homeName, m.awayName, `${m.date}T${m.time}:00Z`)}`,
                  lang,
                )
              : null;
            const body = (
              <>
                <div className="flex items-center gap-1.5">
                  {COMPETITION_LOGOS[m.compSlug] && (
                    <img
                      src={COMPETITION_LOGOS[m.compSlug]}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                  )}
                  <span className="truncate text-[11px] text-muted">{m.compName}</span>
                </div>
                {m.finished ? (
                  <div className="mt-1 text-[11px] font-semibold text-muted">{labels.finished}</div>
                ) : !m.time || m.provisional ? (
                  // Giờ chưa chốt (hoặc nguồn không có giờ) thì nói thẳng là chưa có.
                  // In giờ mặc định ra là bịa — người đọc đặt lịch xem rồi hụt.
                  <div className="mt-1 text-[11px] text-muted">{labels.noTime}</div>
                ) : (
                  <LocalKickoffTime
                    iso={`${m.date}T${m.time}:00Z`}
                    showDate
                    className="mt-1 block text-[11px] text-muted"
                  />
                )}
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <TeamCrest name={m.homeName} />
                  <span className="flex-1 truncate">{m.homeName}</span>
                  {m.finished && (
                    <span className="font-display font-bold tabular-nums">{m.homeScore ?? 0}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <TeamCrest name={m.awayName} />
                  <span className="flex-1 truncate">{m.awayName}</span>
                  {m.finished && (
                    <span className="font-display font-bold tabular-nums">{m.awayScore ?? 0}</span>
                  )}
                </div>
              </>
            );
            const cls =
              "w-[200px] shrink-0 rounded-card border border-line px-4 py-3 transition-colors";
            return href ? (
              <Link
                key={`${m.compSlug}-${m.id}`}
                href={href}
                className={`${cls} hover:border-line-hover hover:bg-card-hover`}
              >
                {body}
              </Link>
            ) : (
              <div key={`${m.compSlug}-${m.id}`} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
