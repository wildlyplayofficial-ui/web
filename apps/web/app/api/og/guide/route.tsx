import { ImageResponse } from "next/og";
import { BRAND_GREEN } from "@/lib/team-palette";

/**
 * Guide/calculator OG card (1200×630) with topic-specific anchor text.
 * Query params: ?title=...&anchor=...&type=guide|calculator
 * Anchor = the proprietary concept-viz in text form (e.g., "-0.5 → Half-ball handicap").
 */

const INK = "#0d1117";
const MUTED = "#5b6572";
const PANEL = "#f4f6f8";
const LINE = "#e2e6ea";

/** Per-slug anchor data — the "concept diagram" as a text data-viz. */
const ANCHORS: Record<string, { anchor: string; badge: string }> = {
  // Guides
  "what-is-asian-handicap": { anchor: "-0.5  ·  -0.75  ·  -1.0  ·  -1.5", badge: "GUIDE" },
  "how-de-vigging-works": { anchor: "110 / -110  →  remove vig  →  50.0% true prob", badge: "GUIDE" },
  "what-is-devigging": { anchor: "Odds 1.91  →  vig 4.5%  →  fair 1.00 / 1.00", badge: "GUIDE" },
  "what-is-closing-line-value": { anchor: "Open 2.10  →  Close 1.95  =  CLV +7.7%", badge: "GUIDE" },
  "kelly-criterion-betting": { anchor: "f* = (bp − q) / b  →  optimal stake", badge: "GUIDE" },
  "what-is-value-betting": { anchor: "Model 55%  vs  Implied 48%  =  +7% edge", badge: "GUIDE" },
  "how-to-read-betting-odds": { anchor: "2.50  =  +150  =  6/4  =  0.60", badge: "GUIDE" },
  "odds-formats-explained": { anchor: "Decimal  ·  American  ·  Fractional  ·  Malay", badge: "GUIDE" },
  "what-makes-a-good-tipster": { anchor: "Record  ·  CLV  ·  Reasoning  ·  Transparency", badge: "GUIDE" },
  "no-play-discipline": { anchor: "Evaluated  →  No edge found  →  PASS", badge: "GUIDE" },
  "responsible-play-guide": { anchor: "Set limits  ·  Never chase  ·  Stay in control", badge: "GUIDE" },
  // Calculators
  "de-vig": { anchor: "Home 1.85  ·  Away 2.05  →  True: 51.8% / 48.2%", badge: "CALCULATOR" },
  "odds-converter": { anchor: "1.75  =  -133  =  3/4  =  0.75", badge: "CALCULATOR" },
  "kelly": { anchor: "Edge 8%  ·  Odds 2.10  →  Stake 7.3% of bankroll", badge: "CALCULATOR" },
};

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Guide";
  const slug = searchParams.get("slug") || "";
  const data = ANCHORS[slug];
  const anchor = data?.anchor || searchParams.get("anchor") || "";
  const badge = data?.badge || searchParams.get("type")?.toUpperCase() || "GUIDE";

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
        <div style={{ position: "relative", display: "flex", width: "100%", height: 280 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              backgroundImage: `linear-gradient(135deg, ${BRAND_GREEN} 0%, #009e42 100%)`,
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
              backgroundColor: "rgba(9,13,20,0.18)",
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
            <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#ffffff" }}>
                <span>Wildly</span>
                <span style={{ color: "#a8ffcf" }}>Play</span>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: "#ffffff",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "7px 18px",
                }}
              >
                {badge}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 55 ? 36 : 44,
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

        {/* Anchor panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "28px 56px 30px",
            justifyContent: "space-between",
          }}
        >
          {anchor ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: `2px solid ${BRAND_GREEN}`,
                borderRadius: 12,
                padding: "16px 28px",
                fontSize: 28,
                fontWeight: 700,
                color: INK,
                letterSpacing: 0.5,
              }}
            >
              {anchor}
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
              Free betting education
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
