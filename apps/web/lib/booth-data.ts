/**
 * Public data layer for The Booth commentary.
 * Reads from booth_shadow via service role (no public RLS policy).
 * Feature-flagged: returns empty when 'booth' flag is off.
 */
import { unstable_cache } from "next/cache";
import { getServiceSupabase } from "./supabase-server";
import { isFeatureEnabled } from "./data";
import type { Lang4 } from "./types";

export interface BoothEntry {
  eventType: string;
  eventMinute: string | null;
  linesEn: Array<{ who: "sonny" | "cole"; text: string }>;
  linesVi: Array<{ who: "sonny" | "cole"; text: string }> | null;
  linesTh: Array<{ who: "sonny" | "cole"; text: string }> | null;
  linesEs: Array<{ who: "sonny" | "cole"; text: string }> | null;
  leadVoice: "sonny" | "cole";
  createdAt: string;
}

/** Get Booth commentary entries for a pick. Returns empty if feature flag off or no data. */
async function getBoothForPickImpl(pickId: string): Promise<BoothEntry[]> {
  const enabled = await isFeatureEnabled("booth");
  if (!enabled) return [];

  const sb = getServiceSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("booth_shadow")
    .select(
      "event_type, event_minute, lines_en, lines_vi, lines_th, lines_es, lead_voice, created_at",
    )
    .eq("pick_id", pickId)
    .eq("lint_passed", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Deduplicate: same event_type + event_minute → keep latest entry only
  const seen = new Map<string, Record<string, unknown>>();
  for (const row of data as Record<string, unknown>[]) {
    const key = `${row.event_type}:${row.event_minute ?? ""}`;
    seen.set(key, row); // later entry overwrites earlier (data is asc by created_at)
  }

  return [...seen.values()].map((row) => ({
    eventType: row.event_type as string,
    eventMinute: row.event_minute as string | null,
    linesEn: row.lines_en as BoothEntry["linesEn"],
    linesVi: row.lines_vi as BoothEntry["linesVi"],
    linesTh: row.lines_th as BoothEntry["linesTh"],
    linesEs: row.lines_es as BoothEntry["linesEs"],
    leadVoice: row.lead_voice as "sonny" | "cole",
    createdAt: row.created_at as string,
  }));
}

export const getBoothForPick = unstable_cache(
  getBoothForPickImpl,
  ["booth-pick"],
  { revalidate: 30, tags: ["booth"] },
);

/** Get lines for a specific language from a BoothEntry. Falls back to EN. */
export function getBoothLines(
  entry: BoothEntry,
  lang: Lang4,
): Array<{ who: "sonny" | "cole"; text: string }> {
  switch (lang) {
    case "vi":
      return entry.linesVi ?? entry.linesEn;
    case "th":
      return entry.linesTh ?? entry.linesEn;
    case "es":
      return entry.linesEs ?? entry.linesEn;
    default:
      return entry.linesEn;
  }
}
