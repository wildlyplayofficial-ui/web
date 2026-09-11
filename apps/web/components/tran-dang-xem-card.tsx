import Link from "next/link";
import { formatKickoff } from "@/lib/format";
import { type Lang, withLang } from "@/lib/i18n";
import { buildPlaySlug } from "@/lib/play-slug";
import { buildMatchSlug } from "@/lib/data";
import type { Pick, WatchingRow } from "@/lib/types";
import type { StripMatch } from "@/components/home-next-matches";
import { TeamCrest } from "@/components/team-crest";

/**
 * "Trận đáng xem hôm nay" — thẻ hero cột phải trên trang chủ (mockup Nick 10/9).
 * Ba trạng thái theo thứ tự ưu tiên:
 *   1. Đã chốt   — có pick của Chú Tám Banh hôm nay → góc nhìn + "Xem nhận định".
 *   2. Đang theo dõi — không pick nhưng đang theo dõi một trận → tóm tin + "chốt trước 2h".
 *   3. Hôm nay nghỉ — không có gì → trận gần giờ đá nhất + "Xem lịch thi đấu".
 * Luôn đeo LOGO đội (TeamCrest) — rule cứng, không dùng vòng tròn trống như mockup.
 */

type L4 = Record<string, string>;
const HEADER: L4 = { vi: "Trận đáng xem hôm nay", en: "Match to watch today", th: "แมตช์น่าดูวันนี้", es: "Partido para ver hoy" };
const BADGE_LOCKED: L4 = { vi: "Đã chốt", en: "Locked in", th: "ล็อคแล้ว", es: "Confirmado" };
const BADGE_WATCHING: L4 = { vi: "Đang theo dõi", en: "Watching", th: "กำลังติดตาม", es: "Siguiendo" };
const BADGE_OFF: L4 = { vi: "Hôm nay nghỉ", en: "Off today", th: "พักวันนี้", es: "Descanso hoy" };
const OFF_MSG: L4 = { vi: "Không có lợi thế rõ, không ép chọn.", en: "No clear edge — no forced pick.", th: "ไม่มีความได้เปรียบชัดเจน ไม่ฝืนเลือก", es: "Sin ventaja clara, sin forzar la elección." };
const CLOSE_SOON: L4 = { vi: "Chú Tám Banh chốt trước giờ đá 2 tiếng.", en: "The Curator locks in 2h before kickoff.", th: "ปิดวิเคราะห์ 2 ชม. ก่อนแข่ง", es: "El Curador cierra 2h antes del inicio." };
const CTA_VIEW: L4 = { vi: "Xem nhận định", en: "View analysis", th: "ดูบทวิเคราะห์", es: "Ver análisis" };
const CTA_FIXTURES: L4 = { vi: "Xem lịch thi đấu", en: "View fixtures", th: "ดูโปรแกรม", es: "Ver calendario" };
const t = (r: L4, lang: string) => r[lang] ?? r.en;

type CTA = { label: string; href: string; ghost?: boolean };

function CardFrame({
  lang, league, badge, badgeTone, home, away, time, body, subline, cta,
}: {
  lang: Lang;
  league?: string;
  badge: string;
  badgeTone: "green" | "muted";
  home: string;
  away: string;
  time: string;
  body?: string;
  subline?: string;
  cta: CTA;
}) {
  const badgeClass =
    badgeTone === "green"
      ? "bg-brand-dim text-brand"
      : "border border-line bg-card text-muted";
  return (
    <div className="flex h-full flex-col gap-3 rounded-card border border-brand/25 bg-brand-dim/20 p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          {t(HEADER, lang)}
          {league ? ` · ${league}` : ""}
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-display text-[0.7rem] font-bold ${badgeClass}`}>
          {badge}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center font-display text-base font-bold sm:text-lg">
          <TeamCrest name={home} />
          {home}
        </p>
        <span className="shrink-0 text-center text-xs leading-tight text-muted">
          {time}
          <span className="block font-display text-sm text-ink">vs</span>
        </span>
        <p className="flex items-center justify-end text-right font-display text-base font-bold sm:text-lg">
          <TeamCrest name={away} />
          {away}
        </p>
      </div>

      {body && (
        <p className="border-l-2 border-brand/50 pl-3 text-sm leading-relaxed text-ink/90 line-clamp-3">
          {body}
        </p>
      )}
      {subline && <p className="text-xs text-muted">{subline}</p>}

      <Link
        href={cta.href}
        className={
          cta.ghost
            ? "mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl border border-brand/50 px-4 py-2 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand-dim"
            : "mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 font-display text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
        }
      >
        {cta.label} →
      </Link>
    </div>
  );
}

export function TranDangXemCard({
  pick, pickThesis, watching, nextMatch, lang,
}: {
  pick: Pick | null;
  pickThesis?: string | null;
  watching: WatchingRow | null;
  nextMatch: StripMatch | null;
  lang: Lang;
}) {
  // 1. Đã chốt nhận định
  if (pick) {
    return (
      <CardFrame
        lang={lang}
        badge={t(BADGE_LOCKED, lang)}
        badgeTone="green"
        home={pick.home_team}
        away={pick.away_team}
        time={formatKickoff(pick.kickoff_utc, lang)}
        body={pickThesis ?? pick.thesis ?? undefined}
        cta={{ label: t(CTA_VIEW, lang), href: withLang(`/play/${buildPlaySlug(pick)}`, lang) }}
      />
    );
  }

  // 2. Đang theo dõi
  if (watching) {
    const note = watching.note_translations?.[lang] ?? watching.note ?? undefined;
    return (
      <CardFrame
        lang={lang}
        league={watching.league}
        badge={t(BADGE_WATCHING, lang)}
        badgeTone="green"
        home={watching.home_team}
        away={watching.away_team}
        time={formatKickoff(watching.kickoff_utc, lang)}
        body={note}
        subline={t(CLOSE_SOON, lang)}
        cta={{
          label: t(CTA_VIEW, lang),
          href: withLang(`/match/${buildMatchSlug(watching.home_team, watching.away_team, watching.kickoff_utc)}`, lang),
        }}
      />
    );
  }

  // 3. Hôm nay nghỉ — trận gần giờ đá nhất
  if (nextMatch) {
    return (
      <CardFrame
        lang={lang}
        league={nextMatch.compName}
        badge={t(BADGE_OFF, lang)}
        badgeTone="muted"
        home={nextMatch.homeName}
        away={nextMatch.awayName}
        time={nextMatch.time}
        body={t(OFF_MSG, lang)}
        cta={{ label: t(CTA_FIXTURES, lang), href: withLang("/matches", lang), ghost: true }}
      />
    );
  }

  return null;
}
