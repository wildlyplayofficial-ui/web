import { ImageResponse } from "next/og";
import { getPick, getTrackRecord } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { formatKickoff, formatOdds, formatUnits } from "@/lib/format";

/**
 * Share image (PNG 1200x630) for ANY non-draft pick — unlike result-card,
 * which only serves settled picks. Published picks get an UPCOMING/LIVE badge
 * plus the current overall record so shares carry credibility; settled picks
 * mirror the result-card layout (badge + score + units). 404 only when the
 * pick doesn't exist. Patterns and color tokens copied from result-card.
 */

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
  upcoming: { label: "UPCOMING", color: C.muted, bg: C.card },
  live: { label: "LIVE", color: C.brand, bg: C.brandDim },
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
  if (!pick) {
    return new Response("Not found", { status: 404 });
  }

  const published = pick.status === "published";
  const record = published ? await getTrackRecord() : null;
  const badge = published
    ? BADGES[new Date(pick.kickoff_utc) <= new Date() ? "live" : "upcoming"]
    : BADGES[pick.status];
  // Flags like the play page; ImageResponse renders emoji via twemoji by default.
  const home = `${teamFlag(pick.home_team)} ${pick.home_team}`.trim();
  const away = `${pick.away_team} ${teamFlag(pick.away_team)}`.trim();
  const matchLine =
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
            gap: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 4,
              color: badge.color,
              backgroundColor: badge.bg,
              border: `2px solid ${badge.color}`,
              borderRadius: 16,
              padding: "10px 40px",
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
            {matchLine}
          </div>
          {published && (
            <div style={{ display: "flex", fontSize: 26, color: C.muted }}>
              {formatKickoff(pick.kickoff_utc, "en")}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 30, color: published ? C.ink : C.muted }}>
            {`${pick.selection} @ ${formatOdds(pick.odds_publish)} · ${pick.stake_units}u`}
          </div>
          {!published && pick.units_pl !== null && (
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: unitsColor }}>
              {formatUnits(pick.units_pl)}
            </div>
          )}
          {record !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28 }}>
              <span style={{ color: C.muted }}>Record</span>
              <span style={{ fontWeight: 700 }}>
                {`${record.wins}-${record.losses}-${record.pushes}`}
              </span>
              <span style={{ color: C.muted }}>·</span>
              <span
                style={{
                  fontWeight: 700,
                  color: record.units_pl >= 0 ? C.brand : C.loss,
                }}
              >
                {formatUnits(record.units_pl)}
              </span>
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
