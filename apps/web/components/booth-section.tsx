import { BoothCommentary } from "@/components/booth-commentary";
import { getBoothLines, type BoothEntry } from "@/lib/booth-data";
import type { Lang } from "@/lib/i18n";

/** Shared Booth block for /play and /match so both show the same live
 *  commentary (Nick 3/7: sync content across the two match URLs). */
export function BoothSection({ entries, lang }: { entries: BoothEntry[]; lang: Lang }) {
  if (entries.length === 0) return null;
  return (
    <section className="mt-8 space-y-3">
      <h3 className="font-display text-lg font-bold">
        <span className="mr-2 inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
        </span>
        The Booth
      </h3>
      <p className="text-xs text-muted">
        {lang === "vi" ? "Ph\u00e2n t\u00edch tr\u1ef1c ti\u1ebfp b\u1edfi Sonny & Cole \u2014 b\u00ecnh lu\u1eadn AI, kh\u00f4ng ph\u1ea3i t\u01b0 v\u1ea5n c\u00e1 c\u01b0\u1ee3c."
          : lang === "th" ? "\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e2a\u0e14\u0e42\u0e14\u0e22 Sonny & Cole \u2014 \u0e04\u0e2d\u0e21\u0e40\u0e21\u0e19\u0e15\u0e4c AI \u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e01\u0e32\u0e23\u0e40\u0e14\u0e34\u0e21\u0e1e\u0e31\u0e19"
            : lang === "es" ? "An\u00e1lisis en vivo por Sonny & Cole \u2014 comentario IA, no consejo de apuestas."
              : "Live analysis by Sonny & Cole \u2014 AI commentary, not betting advice."}
      </p>
      {entries.map((entry, i) => (
        <BoothCommentary key={i} lines={getBoothLines(entry, lang)} eventType={entry.eventType} eventMinute={entry.eventMinute} lang={lang} />
      ))}
    </section>
  );
}
