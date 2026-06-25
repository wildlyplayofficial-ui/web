"use client";

import { useParams } from "next/navigation";
import { getDailyLineDict } from "@/lib/goalline/strings";
import { resolveLang, withLang } from "@/lib/i18n";

export function DailyLineNav() {
  const params = useParams<{ lang: string }>();
  const lang = resolveLang(params.lang);
  const S = getDailyLineDict(lang);

  return (
    <header className="border-b border-line-muted px-5 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <a href={withLang("/daily-line", lang)} className="shrink-0 font-display text-lg font-bold text-brand">
          {S.BRAND}
        </a>
        <nav className="flex min-w-0 gap-3 text-sm overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <a href={withLang("/daily-line/my-picks", lang)} className="shrink-0 text-muted hover:text-ink transition-colors">
            {S.NAV_MY_PICKS}
          </a>
          <a href={withLang("/daily-line/archive", lang)} className="shrink-0 text-muted hover:text-ink transition-colors">
            {S.NAV_ARCHIVE}
          </a>
          <a href={withLang("/daily-line/leaderboard", lang)} className="shrink-0 text-muted hover:text-ink transition-colors">
            {S.NAV_BOARD}
          </a>
        </nav>
      </div>
    </header>
  );
}
