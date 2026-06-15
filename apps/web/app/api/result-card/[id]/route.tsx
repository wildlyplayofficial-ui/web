import { ImageResponse } from "next/og";
import { getPick } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { formatOdds, formatUnits } from "@/lib/format";
import type { PickStatus } from "@/lib/types";

/**
 * Shareable result card (PNG 1200x630) for a settled pick — used for social
 * posts after settlement. Unsettled or unknown picks return 404.
 * Plain text badges (no emoji) and the @vercel/og default font keep the route
 * dependency-free; colors mirror the design tokens in app/globals.css.
 */

const SETTLED: readonly PickStatus[] = ["won", "lost", "push", "void"] as const;

// Design tokens from globals.css (ImageResponse can't read CSS variables).
const C = {
  bg: "#0d1117",
  card: "#161b22",
  ink: "#e6edf3",
  muted: "#8b949e",
  line: "#30363d",
  brand: "#00e676",
  brandDim: "rgba(0, 230, 118, 0.15)",
  loss: "#f85149",
  lossDim: "rgba(248, 81, 73, 0.15)",
} as const;

const BADGES: Record<string, { label: string; color: string; bg: string }> = {
  won: { label: "WON", color: C.brand, bg: C.brandDim },
  lost: { label: "LOST", color: C.loss, bg: C.lossDim },
  push: { label: "PUSH", color: C.muted, bg: C.card },
  void: { label: "VOID", color: C.muted, bg: C.card },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const pick = await getPick(id);
  if (!pick || !SETTLED.includes(pick.status)) {
    return new Response("Not found", { status: 404 });
  }

  const badge = BADGES[pick.status];
  // Flags like the play page (12/6: Peter asked for them on the card).
  // ImageResponse renders emoji via twemoji by default.
  const home = `${teamFlag(pick.home_team)} ${pick.home_team}`.trim();
  const away = `${pick.away_team} ${teamFlag(pick.away_team)}`.trim();
  const score =
    pick.home_score !== null && pick.away_score !== null
      ? `${home} ${pick.home_score}–${pick.away_score} ${away}`
      : `${home} vs ${away}`;
  const unitsColor =
    pick.units_pl === null || pick.units_pl === 0
      ? C.muted
      : pick.units_pl > 0
        ? C.brand
        : C.loss;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: C.bg,
          color: C.ink,
          padding: "56px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Wordmark matching the site header: "Wildly" ink + "Play" brand. */}
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: C.ink }}>Wildly</span><span style={{ color: C.brand }}>Play</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{pick.league}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 4,
              color: badge.color,
              backgroundColor: badge.bg,
              border: `2px solid ${badge.color}`,
              borderRadius: 16,
              padding: "12px 48px",
            }}
          >
            {badge.label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {score}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: C.muted }}>
            {`${pick.selection} @ ${formatOdds(pick.odds_publish)} · ${pick.stake_units}u`}
          </div>
          {pick.units_pl !== null && (
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                color: unitsColor,
              }}
            >
              {formatUnits(pick.units_pl)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            borderTop: `1px solid ${C.line}`,
            paddingTop: 28,
            fontSize: 22,
            color: C.muted,
          }}
        >
          WildlyPlay · The Curator — Human-picked. Not financial advice.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
