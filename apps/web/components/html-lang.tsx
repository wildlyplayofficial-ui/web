"use client";

import { useEffect } from "react";
import type { Lang } from "@/lib/i18n";

/**
 * Keeps `<html lang>` in sync with the path-based lang param.
 * The root layout sets lang from x-lang header server-side;
 * this component corrects it on client navigation.
 */
export function HtmlLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
