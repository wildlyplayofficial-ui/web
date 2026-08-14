import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import { BRAND_GREEN } from "@/lib/team-palette";

/**
 * Shared building blocks for every WildlyPlay OG card (1200×630).
 * Client-approved look: brand-green gradient card, gold eyebrow, white title,
 * a cartoon player anchored bottom-right (generic cards), wildlyplay.com footer.
 *
 * Three concerns live here so all 9 generators stay DRY and consistent:
 *   1. loadOgFonts()      — Space Grotesk (Latin + Vietnamese) with a safe fallback
 *   2. loadPlayerDataUri() — the bottom-right mascot, inlined as a base64 data URI
 *   3. <OgCard/> + ogResponse() — the reusable layout + ImageResponse wrapper
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// ── Brand tokens ──
export const BRAND_DARK = "#0b4a2d";
export const GOLD = "#ffe084";
export const LIGHT_GREEN = "#a8ffcf";
export const CARD_GRADIENT = `linear-gradient(135deg, ${BRAND_GREEN} 0%, ${BRAND_DARK} 100%)`;
export const FONT_FAMILY = "Space Grotesk";

type OgFonts = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>;

// ── Fonts: read the bundled static TTFs once; fall back to Satori's default
//    (which renders Vietnamese correctly) if anything goes wrong. ──
const ASSETS_DIR = join(process.cwd(), "app/api/og/_assets");
let fontsPromise: Promise<OgFonts | undefined> | undefined;

async function loadFontsOnce(): Promise<OgFonts | undefined> {
  try {
    const [medium, bold] = await Promise.all([
      readFile(join(ASSETS_DIR, "SpaceGrotesk-Medium.ttf")),
      readFile(join(ASSETS_DIR, "SpaceGrotesk-Bold.ttf")),
    ]);
    // Guard against the historical broken placeholders (HTML error pages ~100B):
    // a real TTF is tens of KB. If they ever reappear, drop to the default font.
    if (medium.byteLength < 5000 || bold.byteLength < 5000) return undefined;
    return [
      { name: FONT_FAMILY, data: medium, weight: 500, style: "normal" },
      { name: FONT_FAMILY, data: bold, weight: 700, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}

export function loadOgFonts(): Promise<OgFonts | undefined> {
  if (!fontsPromise) fontsPromise = loadFontsOnce();
  return fontsPromise;
}

// ── Player mascot: inline as a data URI (most reliable inside ImageResponse). ──
let playerPromise: Promise<string | null> | undefined;

async function loadPlayerOnce(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public/og/player.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function loadPlayerDataUri(): Promise<string | null> {
  if (!playerPromise) playerPromise = loadPlayerOnce();
  return playerPromise;
}

/** Build the ImageResponse with fonts applied when available, headers preserved. */
export async function ogResponse(
  node: ReactElement,
  opts: { headers?: Record<string, string>; width?: number; height?: number } = {},
): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(node, {
    width: opts.width ?? OG_WIDTH,
    height: opts.height ?? OG_HEIGHT,
    ...(fonts ? { fonts } : {}),
    ...(opts.headers ? { headers: opts.headers } : {}),
  });
}

// ── Layout ──
export type OgChip = { value: string; label: string };
export type OgDetail = { label?: string; value: string };

export type OgCardProps = {
  /** Gold uppercase kicker naming the section, e.g. "◆ Kèo tâm điểm". */
  eyebrow: string;
  /** Big bold headline (auto-sized by length unless titleFontSize is given). */
  title: string;
  titleFontSize?: number;
  /** Optional secondary line under the title. */
  sub?: string | null;
  /** Gold pill, e.g. the pick selection + confidence. */
  badge?: string | null;
  /** Bordered box for a longer anchor line (guide concept viz). */
  noteBox?: string | null;
  /** Stat chips row (home / record cards). */
  chips?: OgChip[] | null;
  /** Detail rows, e.g. league / kickoff. */
  detail?: OgDetail[] | null;
  /** Small muted text in the top-right of the content column (e.g. league). */
  topRight?: string | null;
  /** Footer wordmark link (left). Defaults to "wildlyplay.com". */
  footer?: string;
  /** Small muted note on the footer right. */
  footerRight?: string | null;
  /** Base64 data URI for the mascot; only shown when showPlayer is true. */
  player?: string | null;
  /** Show the bottom-right player (generic cards). Defaults to false. */
  showPlayer?: boolean;
};

function autoTitleSize(title: string): number {
  const n = title.length;
  if (n > 92) return 34;
  if (n > 70) return 40;
  if (n > 50) return 48;
  if (n > 32) return 56;
  return 62;
}

/** The one card layout shared by all 9 generators. */
export function OgCard(props: OgCardProps): ReactNode {
  const {
    eyebrow,
    title,
    titleFontSize,
    sub,
    badge,
    noteBox,
    chips,
    detail,
    topRight,
    footer = "wildlyplay.com",
    footerRight,
    player,
    showPlayer = false,
  } = props;

  const withPlayer = showPlayer && Boolean(player);
  const colWidth = withPlayer ? 660 : 1040;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        fontFamily: FONT_FAMILY,
        backgroundImage: CARD_GRADIENT,
        color: "#ffffff",
      }}
    >
      {withPlayer ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player as string}
          width={620}
          height={620}
          alt=""
          style={{ position: "absolute", right: 0, bottom: 0 }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: colWidth,
          height: "100%",
          padding: "54px 60px",
          justifyContent: "space-between",
        }}
      >
        {/* Top: wordmark + optional top-right note */}
        <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            <span style={{ color: "#ffffff" }}>Wildly</span>
            <span style={{ color: LIGHT_GREEN }}>Play</span>
          </div>
          {topRight ? (
            <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
              {topRight}
            </div>
          ) : null}
        </div>

        {/* Middle: eyebrow → title → sub → badge/note/detail/chips */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Brand diamond as a shape — Space Grotesk has no ◆ glyph, so never
                render it as text (would tofu / trigger a flaky network fallback). */}
            <div
              style={{
                display: "flex",
                width: 13,
                height: 13,
                backgroundColor: GOLD,
                transform: "rotate(45deg)",
                marginRight: 16,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: GOLD,
              }}
            >
              {eyebrow}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: titleFontSize ?? autoTitleSize(title),
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          {sub ? (
            <div style={{ display: "flex", marginTop: 14, fontSize: 27, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
              {sub}
            </div>
          ) : null}
          {badge ? (
            <div style={{ display: "flex", marginTop: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: GOLD,
                  color: BRAND_DARK,
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {badge}
              </div>
            </div>
          ) : null}
          {noteBox ? (
            <div style={{ display: "flex", marginTop: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `2px solid ${GOLD}`,
                  borderRadius: 12,
                  padding: "14px 24px",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: 0.5,
                }}
              >
                {noteBox}
              </div>
            </div>
          ) : null}
          {detail && detail.length ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18, gap: 8 }}>
              {detail.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                  {d.label ? <span style={{ display: "flex", color: GOLD, fontWeight: 700, marginRight: 12 }}>{d.label}</span> : null}
                  <span style={{ display: "flex" }}>{d.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {chips && chips.length ? (
            <div style={{ display: "flex", marginTop: 26, gap: 16 }}>
              {chips.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: "14px 22px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>{c.value}</div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 4,
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      color: GOLD,
                    }}
                  >
                    {c.label}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Bottom: footer */}
        <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: LIGHT_GREEN }}>{footer}</div>
          {footerRight ? (
            <div style={{ display: "flex", fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{footerRight}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
