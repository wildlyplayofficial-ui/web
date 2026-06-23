"use client";

import { useEffect, useState } from "react";

/**
 * Sun/moon toggle for light/dark mode. Reads/writes localStorage("wp_theme")
 * and toggles the `dark` class on <html>. Default is dark (matching the
 * original site look). The inline script in layout.tsx prevents FOUC.
 */
export function ThemeToggle({ onToggle }: { onToggle?: () => void } = {}) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Sync state from DOM on mount AND re-apply theme from localStorage
    // to prevent FOUC during client-side navigation
    const stored = localStorage.getItem("wp_theme");
    const shouldBeDark = stored !== "light";
    document.documentElement.classList.toggle("dark", shouldBeDark);
    setDark(shouldBeDark);
  }, []);

  function toggle(): void {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("wp_theme", next ? "dark" : "light");
    } catch {
      // storage unavailable
    }
    onToggle?.();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink"
    >
      {dark ? (
        // Sun icon (switch to light)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        // Moon icon (switch to dark)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
