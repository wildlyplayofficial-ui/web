"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the address selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,230,118,0.3)]"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
