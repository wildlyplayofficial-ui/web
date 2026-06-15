import { ImageResponse } from "next/og";
import { getTrackRecord } from "@/lib/data";
import { formatUnits } from "@/lib/format";

/**
 * Default share image (PNG 1200x630) for the homepage / site-wide metadata:
 * big wordmark, tagline and the live track record. Color tokens and layout
 * patterns copied from result-card.
 */

// Design tokens from globals.css (ImageResponse can't read CSS variables).
const C = {
  bg: "#0d1117",
  ink: "#e6edf3",
  muted: "#8b949e",
  line: "#30363d",
  brand: "#00e676",
  loss: "#f85149",
} as const;

export async function GET(): Promise<Response> {
  const record = await getTrackRecord();

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
          padding: "72px",
        }}
      >
        <div style={{ display: "flex" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          {/* Wordmark matching the site header: "Wildly" ink + "Play" brand. */}
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700 }}>
            <span style={{ color: C.ink }}>Wildly</span><span style={{ color: C.brand }}>Play</span>
          </div>
          <div style={{ display: "flex", fontSize: 34, color: C.muted }}>
            Handpicked plays for the global crowd
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36 }}>
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
          Human-picked. Not financial advice.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
