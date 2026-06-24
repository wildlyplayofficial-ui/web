"use client";

import type { Lang4 } from "@/lib/types";

export interface BoothLine {
  who: "sonny" | "cole";
  text: string;
}

interface Props {
  lines: BoothLine[];
  eventType: string;
  eventMinute: string | null;
  lang: Lang4;
}

/** Sonny = warm amber (optimist), Cole = cool slate (skeptic).
 *  Deliberately NOT green/red to avoid confusion with win/loss pick colors. */
const VOICE_STYLES = {
  sonny: {
    dot: "bg-amber-400",
    name: "text-amber-400",
    label: "Sonny",
  },
  cole: {
    dot: "bg-slate-400",
    name: "text-slate-400",
    label: "Cole",
  },
} as const;

export function BoothCommentary({ lines, eventType, eventMinute, lang }: Props) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-lg border border-line/50 bg-card/50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted">
          The Booth
        </span>
        {eventMinute && (
          <span className="font-display text-[10px] font-semibold text-brand">
            {eventMinute}&apos; {eventType}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const style = VOICE_STYLES[line.who];
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1 flex w-16 shrink-0 items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
                <span className={`font-display text-xs font-semibold ${style.name}`}>
                  {style.label}
                </span>
              </span>
              <p className="text-sm leading-relaxed text-ink">{line.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Full Booth section for a pick — renders all commentary entries. */
export function BoothSection({
  entries,
  lang,
}: {
  entries: Array<{
    lines: Record<string, BoothLine[]>;
    eventType: string;
    eventMinute: string | null;
  }>;
  lang: Lang4;
}) {
  if (entries.length === 0) return null;

  const langKey = `lines_${lang}` as const;

  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold">
        <span className="mr-2 inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
        </span>
        The Booth
      </h3>
      <p className="text-xs text-muted">
        {lang === "vi"
          ? "Phân tích trực tiếp bởi Sonny & Cole — bình luận AI, không phải tư vấn cá cược."
          : lang === "th"
            ? "วิเคราะห์สดโดย Sonny & Cole — คอมเมนต์ AI ไม่ใช่คำแนะนำการเดิมพัน"
            : lang === "es"
              ? "Análisis en vivo por Sonny & Cole — comentario IA, no consejo de apuestas."
              : "Live analysis by Sonny & Cole — AI commentary, not betting advice."}
      </p>
      {entries.map((entry, i) => {
        const lines = (entry.lines[langKey] ?? entry.lines.lines_en) as BoothLine[];
        return (
          <BoothCommentary
            key={i}
            lines={lines}
            eventType={entry.eventType}
            eventMinute={entry.eventMinute}
            lang={lang}
          />
        );
      })}
    </section>
  );
}
