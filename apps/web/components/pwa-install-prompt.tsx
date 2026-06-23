"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "wp_pwa_dismissed";
const VISIT_KEY = "wp_visit_count";

/**
 * PWA install banner. Shows after the user's 2nd visit (not on first load).
 * Dismissible, remembers dismissal in localStorage.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already installed (standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch { /* empty */ }

    // Track visits — show prompt on 2nd+ visit
    let visits = 1;
    try {
      visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
      localStorage.setItem(VISIT_KEY, String(visits));
    } catch { /* empty */ }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch { /* empty */ }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-card border border-line bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-dim">
          <span className="text-lg">⚽</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Install WildlyPlay</p>
          <p className="text-xs text-muted">Quick access from your home screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-bold text-bg transition-transform hover:-translate-y-0.5"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-muted hover:text-ink"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
