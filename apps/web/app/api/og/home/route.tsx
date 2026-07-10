import { ImageResponse } from "next/og";
import { getTrackRecordForAuthor } from "@/lib/data";
import { BRAND_GREEN } from "@/lib/team-palette";

/**
 * Home share image (PNG 1200x630): vibrant brand card with live Curator record.
 * Light/premium design matching the rest of the og card system.
 * Curator-only record (§7.1 firewall — never blend Scout).
 */

const INK = "#0d1117";
const MUTED = "#5b6572";
const PANEL = "#f4f6f8";
const LINE = "#e2e6ea";

export async function GET(): Promise<Response> {
  const record = await getTrackRecordForAuthor("curator");
  const asOf = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

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
        {/* Green header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: 340,
            backgroundImage: `linear-gradient(135deg, ${BRAND_GREEN} 0%, #009e42 100%)`,
            gap: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#ffffff" }}>
            <span>Wildly</span>
            <span style={{ color: "#a8ffcf" }}>Play</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.85)" }}>
            Handpicked plays for the global crowd
          </div>
        </div>

        {/* Record panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "28px 56px 30px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, fontSize: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND_GREEN }} />
              <span style={{ fontWeight: 700, color: MUTED, fontSize: 24 }}>Curator</span>
            </div>
            <span style={{ fontWeight: 800 }}>
              {record.wins}-{record.losses}-{record.pushes}
            </span>
            <span style={{ fontWeight: 800, color: record.units_pl >= 0 ? BRAND_GREEN : "#e5484d" }}>
              {record.units_pl > 0 ? "+" : ""}{record.units_pl}u
            </span>
            <span style={{ fontSize: 22, color: MUTED }}>
              · {asOf}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${LINE}`,
              paddingTop: 18,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: INK }}>
              www.wildlyplay.com
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
              Human-picked. Not financial advice.
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
