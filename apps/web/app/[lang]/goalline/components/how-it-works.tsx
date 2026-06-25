"use client";

import { useState, useEffect } from "react";
import { getDailyLineDict } from "@/lib/goalline/strings";
import type { Lang } from "@/lib/i18n";

/**
 * Collapsible "How it works" section — shows on first visit,
 * remembers dismissal in localStorage.
 */
export function HowItWorks({ lang = "en" }: { lang?: Lang }) {
  const S = getDailyLineDict(lang);
  const steps = [
    { num: "1", title: S.STEP_1_TITLE, desc: S.STEP_1_DESC, icon: "\u26BD" },
    { num: "2", title: S.STEP_2_TITLE, desc: S.STEP_2_DESC, icon: "\u{1F3AF}" },
    { num: "3", title: S.STEP_3_TITLE, desc: S.STEP_3_DESC, icon: "\u{1F3C6}" },
  ];
  const [dismissed, setDismissed] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    setDismissed(localStorage.getItem("gl_how_dismissed") === "1");
  }, []);

  // Loading state — reserve space to prevent CLS
  if (dismissed === null) {
    return <div className="mb-6 h-[200px] sm:h-[120px]" />;
  }

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("gl_how_dismissed");
          setDismissed(false);
        }}
        className="mb-4 text-xs text-muted hover:text-brand transition-colors"
      >
        {S.HOW_IT_WORKS_TITLE} &darr;
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-ink">{S.HOW_IT_WORKS_TITLE}</h3>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("gl_how_dismissed", "1");
            setDismissed(true);
          }}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          {S.GOT_IT} &times;
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.num}>
            <div className="text-2xl">{step.icon}</div>
            <p className="mt-1 font-display text-xs font-bold text-ink">{step.title}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
