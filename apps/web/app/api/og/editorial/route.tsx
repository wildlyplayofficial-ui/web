import { ImageResponse } from "next/og";
import { BRAND_GREEN } from "@/lib/team-palette";

/**
 * Branded editorial OG card (1200×630) for utility/evergreen pages
 * (guides hub, calculators hub + individual calcs, transparency).
 * Query params: ?title=...&subtitle=...
 * Green brand gradient, WildlyPlay mark, no teams/crests.
 */

const INK = "#0d1117";
const MUTED = "#5b6572";
const PANEL = "#f4f6f8";
const LINE = "#e2e6ea";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "WildlyPlay";
  const subtitle = searchParams.get("subtitle") || null;
  const color = searchParams.get("color") || BRAND_GREEN;

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
        {/* Green brand header */}
        <div style={{ position: "relative", display: "flex", width: "100%", height: 288 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundColor: "rgba(9,13,20,0.22)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              padding: "30px 56px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#ffffff" }}>
              <span>Wildly</span>
              <span style={{ color: "#a8ffcf" }}>Play</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 50 ? 40 : 52,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                paddingRight: 24,
              }}
            >
              {title}
            </div>
          </div>
        </div>

        {/* Light info panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "30px 56px",
            justifyContent: "space-between",
          }}
        >
          {subtitle ? (
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: MUTED, lineHeight: 1.3 }}>
              {subtitle}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
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
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: INK }}>
              www.wildlyplay.com
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED }}>
              Handpicked plays for the global crowd
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}
