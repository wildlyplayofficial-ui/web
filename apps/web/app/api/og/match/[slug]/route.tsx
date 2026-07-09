import { ImageResponse } from "next/og";
import { getMatchBySlug } from "@/lib/data";

/**
 * Dynamic share image (PNG 1200x630) for /match hub pages.
 * Mirrors the /api/og/news card so every fixture gets its own share preview
 * instead of the generic og-home.png (Nick 09/07: og:image = P0 funnel-share).
 * Shows teams, league, and the current state of our coverage (pick / result / watching).
 */

const C = {
  bg: "#0d1117",
  ink: "#e6edf3",
  muted: "#8b949e",
  line: "#30363d",
  brand: "#00e676",
  loss: "#ff5c5c",
  scout: "#5f9c99",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);
  if (!match) return new Response("Not found", { status: 404 });

  const pick = match.picks[0];
  const author = pick?.author ?? match.watching?.author ?? "curator";
  const accent = author === "scout" ? C.scout : C.brand;

  // Coverage state → badge + sub-line.
  let badgeLabel: string;
  let badgeColor: string;
  let subLine: string;
  if (pick && ["won", "lost", "push"].includes(pick.status)) {
    badgeLabel = pick.status.toUpperCase();
    badgeColor = pick.status === "won" ? C.brand : pick.status === "lost" ? C.loss : C.muted;
    const pl = pick.units_pl !== null ? ` \u00b7 ${pick.units_pl > 0 ? "+" : ""}${pick.units_pl}u` : "";
    subLine = `FT ${pick.home_score}\u2013${pick.away_score}${pl}`;
  } else if (pick) {
    badgeLabel = "OUR PICK";
    badgeColor = accent;
    subLine = `${pick.selection} @ ${pick.odds_publish}`;
  } else if (match.watching) {
    badgeLabel = "WATCHING";
    badgeColor = accent;
    subLine = match.league || "On our radar";
  } else {
    badgeLabel = "PREVIEW";
    badgeColor = accent;
    subLine = match.league || "Match preview";
  }

  const matchup = `${match.homeTeam} vs ${match.awayTeam}`;
  const titleSize = matchup.length > 40 ? 52 : matchup.length > 28 ? 60 : 68;

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
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: C.ink }}>Wildly</span>
            <span style={{ color: C.brand }}>Play</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
              color: badgeColor,
              border: `2px solid ${badgeColor}`,
              borderRadius: 10,
              padding: "6px 20px",
            }}
          >
            {badgeLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              textAlign: "center",
            }}
          >
            {matchup}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: C.muted }}>
            {subLine}
          </div>
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
          {author === "scout"
            ? "WildlyPlay \u00b7 The Scout \u2014 AI-picked plays, not a real person"
            : "WildlyPlay \u00b7 The Curator \u2014 Handpicked plays for the global crowd"}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
