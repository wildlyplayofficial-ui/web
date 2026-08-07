import Link from "next/link";
import type { KnockoutMatch } from "@/lib/standings";
import { withLang, type Lang } from "@/lib/i18n";
import { buildMatchSlug } from "@/lib/data";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "@/components/local-kickoff-time";
import { COMPETITION_LOGOS } from "@/lib/competition-logos";

/* eslint-disable @next/next/no-img-element */

/**
 * Dải trận sắp đá của một giải, đặt trên trang chủ (Peter 7/8).
 *
 * Trước đó trang chủ KHÔNG hề nhắc tới Ngoại hạng Anh: không chữ, không link
 * tới trang lịch, không link tới bài nào — trong khi mùa giải khai mạc sau 14
 * ngày và mình đã có 380 trang trận. Cấu trúc bê từ vnexpress: dải ngang cuộn
 * được, mỗi thẻ là giờ + hai đội, đặt ngay đầu trang giải.
 */
export function HomeLeagueStrip({
  name,
  slug,
  matches,
  lang,
  daysToOpen,
  labels,
}: {
  name: string;
  slug: string;
  matches: KnockoutMatch[];
  lang: Lang;
  /** null khi mùa đã lăn bóng — lúc đó hiện nhãn "đã bắt đầu" thay cho đếm ngược. */
  daysToOpen: number | null;
  labels: { opensIn: string; seasonLive: string; schedule: string; standings: string };
}) {
  if (matches.length === 0) return null;

  return (
    <section className="pb-10">
      <div className="rounded-card border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          {COMPETITION_LOGOS[slug] && (
            <img src={COMPETITION_LOGOS[slug]} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
          )}
          <h2 className="font-display text-lg font-bold">{name}</h2>
          <span className="rounded-full border border-brand/40 bg-brand-dim px-3 py-1 text-xs font-semibold text-brand">
            {daysToOpen == null
              ? labels.seasonLive
              : labels.opensIn.replace("{n}", String(daysToOpen))}
          </span>
          <div className="ml-auto flex gap-4 text-sm font-semibold">
            <Link href={withLang(`/competitions/${slug}/fixtures`, lang)} className="text-brand hover:underline">
              {labels.schedule} &rarr;
            </Link>
            <Link href={withLang(`/competitions/${slug}`, lang)} className="hidden text-muted hover:text-ink sm:inline">
              {labels.standings}
            </Link>
          </div>
        </div>

        {/* Cuộn ngang trong khung riêng — thân trang không được đẩy ngang theo. */}
        <div className="flex gap-3 overflow-x-auto px-5 py-4">
          {matches.map((m) => {
            const href = m.time
              ? withLang(`/match/${buildMatchSlug(m.homeName, m.awayName, `${m.date}T${m.time}:00Z`)}`, lang)
              : null;
            const body = (
              <>
                <LocalKickoffTime
                  iso={`${m.date}T${m.time}:00Z`}
                  showDate
                  className="text-[11px] text-muted"
                />
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <TeamCrest name={m.homeName} />
                  <span className="truncate">{m.homeName}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <TeamCrest name={m.awayName} />
                  <span className="truncate">{m.awayName}</span>
                </div>
              </>
            );
            const cls =
              "w-[190px] shrink-0 rounded-card border border-line px-4 py-3 transition-colors";
            return href ? (
              <Link key={m.id} href={href} className={`${cls} hover:border-line-hover hover:bg-card-hover`}>
                {body}
              </Link>
            ) : (
              <div key={m.id} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
