"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/lib/i18n";

/**
 * Share bar on the play detail page (Nick, 12/6): copy link + quick share to
 * Telegram, Facebook, WhatsApp and X, plus the native share sheet when the
 * browser has one. URLs are built at click time from window.location so
 * ?lang= is preserved; shares pull the dynamic OG card automatically.
 */

const TARGETS = [
  { label: "Telegram", href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
  { label: "Facebook", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { label: "WhatsApp", href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  { label: "X", href: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
] as const;

const PILL =
  "rounded-full border border-line bg-card px-3.5 py-1 font-display text-xs font-semibold text-muted transition-colors hover:text-ink";

export function ShareBar({ lang, text }: { lang: Lang; text: string }) {
  const dict = getDict(lang);
  const [copied, setCopied] = useState(false);

  function copy(): void {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // clipboard unavailable — the platform buttons still work
      });
  }

  function open(href: (u: string, t: string) => string): void {
    window.open(
      href(encodeURIComponent(window.location.href), encodeURIComponent(text)),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function native(): void {
    if (typeof navigator.share === "function") {
      navigator.share({ text, url: window.location.href }).catch(() => undefined);
    } else {
      copy();
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-xs text-muted">{dict.share.title}</span>
      <button type="button" onClick={copy} className={PILL} aria-live="polite">
        {copied ? dict.share.copied : dict.share.copy}
      </button>
      {TARGETS.map(({ label, href }) => (
        <button key={label} type="button" onClick={() => open(href)} className={PILL}>
          {label}
        </button>
      ))}
      <button type="button" onClick={native} className={PILL}>
        {dict.share.more}
      </button>
    </div>
  );
}
