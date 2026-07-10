import { ImageResponse } from "next/og";
import { getTrackRecordForAuthor } from "@/lib/data";
import { BRAND_GREEN } from "@/lib/team-palette";
import type { Author } from "@/lib/types";

/**
 * Data-hub OG card (1200×630) showing live Curator + Scout records.
 * Used for /archive and /stats pages. Date-stamped to prevent stale CDN reads.
 * Query param: ?page=archive|stats (changes subtitle).
 */

const INK = "#0d1117";
const MUTED = "#5b6572";
const PANEL = "#f4f6f8";
const LINE = "#e2e6ea";
const SCOUT_TEAL = "#5f9c99";

function formatPl(n: number): string {
  return n > 0 ? `+${n}u` : `${n}u`;
}

function roi(r: { wins: number; losses: number; pushes: number; units_pl: number; settled: number }): string {
  if (r.settled === 0) return "—";
  return `${((r.units_pl / r.settled) * 100).toFixed(1)}%`;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "archive";

  const [curator, scout] = await Promise.all([
    getTrackRecordForAuthor("curator"),
    getTrackRecordForAuthor("scout"),
  ]);

  const asOf = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const title = page === "stats" ? "Statistics" : "Track Record";
  const subtitle =
    page === "stats"
      ? "ROI, CLV, and calibration by league and market"
      : "Every pick, public forever. We post our losses too.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PANEL,
          color: INK,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: 200,
            backgroundImage: `linear-gradient(135deg, ${BRAND_GREEN} 0%, #009e42 100%)`,
            padding: "30px 56px",
            justifyContent: "space-between",
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
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#ffffff" }}>
              <span>Wildly</span>
              <span style={{ color: "#a8ffcf" }}>Play</span>
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
              as of {asOf}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
        </div>

        {/* Records panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "28px 56px 30px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Curator record */}
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: BRAND_GREEN,
                }}
              />
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: MUTED, width: 120 }}>
                Curator
              </div>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: INK }}>
                {curator.wins}-{curator.losses}-{curator.pushes}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 800,
                  color: curator.units_pl >= 0 ? BRAND_GREEN : "#e5484d",
                }}
              >
                {formatPl(curator.units_pl)}
              </div>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: MUTED }}>
                ROI {roi(curator)}
              </div>
            </div>

            {/* Scout record */}
            {scout.settled > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    display: "flex",
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: SCOUT_TEAL,
                  }}
                />
                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: MUTED, width: 120 }}>
                  Scout
                </div>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: INK }}>
                  {scout.wins}-{scout.losses}-{scout.pushes}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 800,
                    color: scout.units_pl >= 0 ? SCOUT_TEAL : "#e5484d",
                  }}
                >
                  {formatPl(scout.units_pl)}
                </div>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: MUTED }}>
                  ROI {roi(scout)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
              {subtitle}
            </div>
            <div
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${LINE}`,
                paddingTop: 14,
              }}
            >
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: INK }}>
                {curator.settled + scout.settled} settled plays
              </div>
              <div style={{ display: "flex", fontSize: 16, color: MUTED }}>
                www.wildlyplay.com
              </div>
            </div>
          </div>
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
