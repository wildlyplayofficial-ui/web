import Link from "next/link";
import { teamFlag } from "@/lib/flags";
import { buildMatchSlug } from "@/lib/data";
import { getDict, type Lang, withLang } from "@/lib/i18n";
import type { BuzzSnapshot, WatchingRow } from "@/lib/types";
import { MatchCountdown } from "./match-countdown";
import { LocalKickoffTime } from "./local-kickoff-time";

/** Server component — "The Curator is watching [match]" teaser on the homepage.
 *  Pass hideLinks=true when rendering inside the match page (links are redundant there). */
export function WatchingTeaser({ items, lang, hideLinks = false }: { items: WatchingRow[]; lang: Lang; hideLinks?: boolean }) {
  if (items.length === 0) return null;
  const dict = getDict(lang);

  return (
    <section className="pb-8">
      <div className="flex flex-col gap-3">
        {items.map((w) => (
          <WatchingCard key={w.id} item={w} dict={dict} lang={lang} hideLinks={hideLinks} />
        ))}
      </div>
    </section>
  );
}

const BUZZ_AI_LABEL: Record<string, string> = {
  en: "AI summary from",
  vi: "Tổng hợp AI từ",
  th: "สรุป AI จาก",
  es: "Resumen IA de",
};

const CONFIDENCE_LABELS: Record<string, Record<string, string>> = {
  high: { en: "High", vi: "Cao", th: "สูง", es: "Alto" },
  medium: { en: "Medium", vi: "Trung bình", th: "ปานกลาง", es: "Medio" },
  low: { en: "Low", vi: "Thấp", th: "ต่ำ", es: "Bajo" },
};

function translateConfidence(confidence: string, lang: string): string {
  return CONFIDENCE_LABELS[confidence]?.[lang] ?? CONFIDENCE_LABELS[confidence]?.en ?? confidence;
}

/** Compare two sentiment snapshots and return a trend arrow. */
function sentimentTrend(current: number, previous: number): string {
  const delta = current - previous;
  if (delta > 10) return "\u2191";    // ↑
  if (delta > 3) return "\u2197";     // ↗
  if (delta > -3) return "\u2192";    // →
  if (delta > -10) return "\u2198";   // ↘
  return "\u2193";                    // ↓
}

function WatchingCard({ item, dict, lang, hideLinks = false }: { item: WatchingRow; dict: ReturnType<typeof getDict>; lang: Lang; hideLinks?: boolean }) {
  const homeFlag = teamFlag(item.home_team);
  const awayFlag = teamFlag(item.away_team);

  // Resolve note in viewer's language
  const note = item.note_translations?.[lang] ?? item.note;
  const isPast = new Date(item.kickoff_utc).getTime() < Date.now();

  // Latest buzz snapshot from history
  const history = item.buzz_history ?? [];
  const buzz = history.length > 0 ? history[history.length - 1] : null;
  const prevBuzz = history.length > 1 ? history[history.length - 2] : null;

  const isScout = item.author === "scout";

  return (
    <div className={isScout ? "rounded-card border border-scout/20 bg-scout-dim/30 p-4 shadow-card" : "rounded-card border border-brand/20 bg-brand-dim/30 p-4 shadow-card"}>
      <div className="mb-2 flex items-center gap-2">
        {!isPast && (
          <span className="relative flex h-2 w-2">
            <span className={isScout ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-scout opacity-75" : "absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75"} />
            <span className={isScout ? "relative inline-flex h-2 w-2 rounded-full bg-scout" : "relative inline-flex h-2 w-2 rounded-full bg-brand"} />
          </span>
        )}
        <span className={isScout ? "font-display text-sm font-semibold text-scout" : "font-display text-sm font-semibold text-brand"}>
          {isScout
            ? isPast ? dict.watching.titlePastScout : dict.watching.titleScout
            : isPast ? dict.watching.titlePast : dict.watching.title}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-base font-bold">
          {homeFlag && <span className="mr-1">{homeFlag}</span>}
          {item.home_team}
          <span className="mx-2 text-muted">vs</span>
          {awayFlag && <span className="mr-1">{awayFlag}</span>}
          {item.away_team}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <MatchCountdown kickoffUtc={item.kickoff_utc} prefix="" />
          <LocalKickoffTime iso={item.kickoff_utc} />
        </div>
      </div>

      {note && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold">{item.author === "scout" ? dict.watching.noteScout : dict.watching.note}:</span> {note}
        </p>
      )}

      {item.close_note && (
        <p className={isScout ? "mt-2 text-sm italic text-scout/90" : "mt-2 text-sm italic text-brand/90"}>
          {item.close_note}
        </p>
      )}

      {item.author === "scout" && (
        <p className="mt-2 text-xs text-muted/80">{dict.watching.disclosureScout}</p>
      )}

      {buzz && (
        <div className="mt-3 rounded-lg border border-line bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display font-bold text-brand">{buzz.sentiment_pct}%</span>
            {prevBuzz && (
              <span className="text-xs text-muted">{sentimentTrend(buzz.sentiment_pct, prevBuzz.sentiment_pct)}</span>
            )}
            <span className="text-muted">{buzz.lean_label[lang] ?? buzz.lean_label.en}</span>
            <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs text-muted">{translateConfidence(buzz.confidence, lang)}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {(buzz.themes[lang] ?? buzz.themes.en).map((t, i) => (
              <li key={i} className="text-xs text-muted">{"\u2022"} {t}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted/60">
            {BUZZ_AI_LABEL[lang] ?? BUZZ_AI_LABEL.en}
            {buzz.sources && buzz.sources.length > 0 && ` (${buzz.sources.join(", ")})`}
          </p>
        </div>
      )}

      {!hideLinks && (
        <div className="mt-3">
          <Link
            href={withLang(`/match/${buildMatchSlug(item.home_team, item.away_team, item.kickoff_utc)}`, lang)}
            className={isScout ? "inline-flex items-center gap-1 text-sm font-semibold text-scout transition-colors hover:text-scout/80" : "inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-brand/80"}
          >
            {dict.match.viewMatch} →
          </Link>
        </div>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Link to the news article — only renders when the article exists (avoids 404). */
async function NewsLink({ item, lang }: { item: WatchingRow; lang: Lang }) {
  const slug = `news-${slugify(item.home_team)}-vs-${slugify(item.away_team)}-${item.kickoff_utc.slice(0, 10)}`;
  // Guard: check if the news post actually exists before rendering the link
  const { getPost } = await import("@/lib/data");
  const post = await getPost(slug, lang);
  if (!post) return null;

  const labels: Record<string, string> = {
    en: `${item.home_team} vs ${item.away_team}: Pre-match analysis`,
    vi: `${item.home_team} vs ${item.away_team}: Phân tích trước trận`,
    th: `${item.home_team} vs ${item.away_team}: วิเคราะห์ก่อนแมตช์`,
    es: `${item.home_team} vs ${item.away_team}: Análisis previo`,
  };
  return (
    <Link
      href={lang === "en" ? `/analysis/${slug}` : `/${lang}/analysis/${slug}`}
      className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-brand/80"
    >
      {labels[lang] ?? labels.en} →
    </Link>
  );
}
