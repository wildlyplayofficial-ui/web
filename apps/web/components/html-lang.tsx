"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { resolveLang } from "@/lib/i18n";

/**
 * Keeps `<html lang>` in sync with the `?lang=xx` query param.
 * Layouts can't read searchParams, so the attribute defaults to "en"
 * server-side and is corrected on the client for vi/th/es.
 */
export function HtmlLang() {
  const searchParams = useSearchParams();
  const lang = resolveLang(searchParams.get("lang") ?? undefined);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
