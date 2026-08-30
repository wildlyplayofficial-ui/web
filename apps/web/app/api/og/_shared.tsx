import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import { BRAND_GREEN } from "@/lib/team-palette";
import { WORDMARK_A, WORDMARK_B } from "@/lib/brand";

/**
 * Shared building blocks for every banhbong.net OG card (1200×630).
 * Client-approved look: brand-green gradient card, gold eyebrow, white title,
 * a cartoon player anchored bottom-right (generic cards), banhbong.net footer.
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

// ── Club crest → data URI (thẻ soi kèo cần logo 2 đội — Peter 25/8) ──
const badgePromises = new Map<string, Promise<string | null>>();

async function loadBadgeOnce(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Crest image (remote URL) as a cached base64 data URI, or null on any failure. */
export function loadBadgeDataUri(url: string): Promise<string | null> {
  let p = badgePromises.get(url);
  if (!p) {
    p = loadBadgeOnce(url);
    badgePromises.set(url, p);
  }
  return p;
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

// ── Brand mark bb, inlined as data URI. Bản TRẮNG cho nền tối, bản MỰC cho nền sáng:
//    thẻ kết quả nền mint (Nick chốt 29/8) mà dùng bản trắng thì logo chìm gần mất. ──
const markPromises = new Map<string, Promise<string | null>>();

async function loadMarkOnce(ten: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), `public/brand/${ten}`));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function loadMarkDataUri(tone: "trang" | "muc" = "trang"): Promise<string | null> {
  const ten = tone === "muc" ? "bb-mark-ink.png" : "bb-mark-white.png";
  let p = markPromises.get(ten);
  if (!p) {
    p = loadMarkOnce(ten);
    markPromises.set(ten, p);
  }
  return p;
}

// ── Per-team cartoon: public/og/players/{slug}.png, inlined as a data URI.
//    Missing file → null, so the caller keeps a text-only card. Short club
//    names map to the canonical slug so "Man City" and "Manchester City" both
//    resolve to manchester-city.png.
//
//    ⚠️ Bảng này phải trỏ về TÊN ĐẦY ĐỦ, đúng tên file trong public/og/players.
//    Bản cũ trỏ ngược lại ("tottenham hotspur" → "tottenham") trong khi #131 lưu
//    file là tottenham-hotspur.png → readFile trượt, catch nuốt lỗi, thẻ ra
//    trống nửa phải mà không báo gì. Dính 6 đội: Tottenham, Newcastle, Brighton,
//    Leeds, Bournemouth, West Ham — Nick bắt được trên thẻ Tottenham 29/8.
//    THÊM ẢNH MỚI: đặt tên file theo TÊN ĐẦY ĐỦ, đừng thêm alias rút gọn. ──
const EPL_TEAM_ALIASES: Record<string, string> = {
  "man city": "manchester city",
  "man utd": "manchester united",
  "man united": "manchester united",
  "manchester utd": "manchester united",
  spurs: "tottenham hotspur",
  tottenham: "tottenham hotspur",
  wolves: "wolverhampton wanderers",
  "nottm forest": "nottingham forest",
  "brighton and hove albion": "brighton hove albion",
  brighton: "brighton hove albion",
  "west ham": "west ham united",
  newcastle: "newcastle united",
  leeds: "leeds united",
  bournemouth: "afc bournemouth",
  // Tên ngoài Ngoại hạng Anh: kho lưu tên ngắn, nguồn kèo ghi tên dài.
  "juventus turin": "juventus",
};

// ── Đuôi/tiền tố pháp nhân trong tên đội: "Arsenal FC", "Sunderland AFC",
//    "AS Monaco". Kho ảnh đặt theo tên gọi thường ngày (arsenal.png, monaco.png)
//    nên phải gỡ mấy chữ này TRƯỚC khi tra bảng alias, không thì "Arsenal FC" đi
//    tìm arsenal-fc.png rồi trượt im lặng như vụ Tottenham 29/8. ──
const CLUB_PREFIX = /^(?:fc|afc|as|ac|ss|sc|cf|cd|rc)\s+/;
const CLUB_SUFFIX = /\s+(?:fc|afc|cf|sc|ac|sad)$/;

/** Filename slug for a team's cartoon, e.g. "Man City" → "manchester-city". */
export function teamImageSlug(name: string): string {
  const norm = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(CLUB_PREFIX, "")
    .replace(CLUB_SUFFIX, "")
    .trim();
  return (EPL_TEAM_ALIASES[norm] ?? norm).replace(/\s+/g, "-");
}

const teamPlayerPromises = new Map<string, Promise<string | null>>();

async function loadTeamPlayerOnce(slug: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), `public/og/players/${slug}.png`));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Cartoon for a specific team, or null when no art exists for it yet. */
export function loadTeamPlayerDataUri(team: string): Promise<string | null> {
  const slug = teamImageSlug(team);
  let p = teamPlayerPromises.get(slug);
  if (!p) {
    p = loadTeamPlayerOnce(slug);
    teamPlayerPromises.set(slug, p);
  }
  return p;
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
  /** Club crest data URIs shown as chips above the title (soi kèo cards). */
  crests?: string[] | null;
  /** Footer wordmark link (left). Defaults to "banhbong.net". */
  footer?: string;
  /** Small muted note on the footer right. */
  footerRight?: string | null;
  /** Base64 data URI for the mascot; only shown when showPlayer is true. */
  player?: string | null;
  /** Show the bottom-right player (generic cards). Defaults to false. */
  showPlayer?: boolean;
  /** Base64 data URI of the bb mark; when set, replaces the top-left wordmark (Nick 19/8: chữ banhbong.net đã có ở footer). */
  mark?: string | null;
  /** Huy hiệu CLB phóng to làm nền mờ, cho thẻ KHÔNG có cartoon người.
   *  Trung thực hơn dán một cầu thủ bất kỳ: bài nói về CLB thì hiện CLB. */
  crestWatermark?: string | null;
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
    crests,
    footer = "banhbong.net",
    footerRight,
    player,
    showPlayer = false,
    mark,
    crestWatermark,
  } = props;

  const withPlayer = showPlayer && Boolean(player);
  // Thẻ chữ (không mascot) phải dùng trọn 1200px: cột 1040 cũ làm mọi phần tử
  // căn phải dừng ở x=980 — lề phải 220px vs lề trái 60px, Nick 25/8: "chữ bị
  // lệch qua trái". Có mascot thì cột hẹp 660 là chủ đích (ảnh chiếm bên phải).
  const colWidth = withPlayer ? 660 : OG_WIDTH;

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
      {/* Hoạ tiết nền: sọc chéo mờ + hai vòng tròn viền, y như khuôn ảnh bìa
          tools/anh/. Không có nó thì nửa trái là mảng xanh trơn — thẻ tin đo ra
          87,6% vùng phẳng, rớt xa ngưỡng 55% (Peter chỉ ra 27/8).
          Vẽ TRƯỚC ảnh cầu thủ để không có vệt nào chạy ngang qua áo — đúng lỗi
          đã trả giá hôm 26/8 khi sọc đè lên người. */}
      {/* Sọc chéo vẽ bằng div THẬT, không dùng repeating-linear-gradient:
          bộ dựng ảnh BỎ QUA gradient lặp mà không báo lỗi — thử lần đầu điểm
          không nhúc nhích một chút nào, đó là dấu hiệu nó bị nuốt. */}
      {Array.from({ length: 26 }, (_, i) => (
        <div
          key={`soc-${i}`}
          style={{
            position: "absolute",
            top: -180,
            left: i * 62 - 220,
            width: 20,
            height: 1000,
            display: "flex",
            transform: "rotate(24deg)",
            backgroundColor: i % 2 ? "rgba(255,255,255,0.055)" : "rgba(0,45,24,0.05)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: -150,
          top: 120,
          width: 520,
          height: 520,
          borderRadius: 260,
          border: "3px solid rgba(255,255,255,0.10)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 240,
          top: -170,
          width: 380,
          height: 380,
          borderRadius: 190,
          border: "3px solid rgba(255,255,255,0.07)",
          display: "flex",
        }}
      />

      {!withPlayer && crestWatermark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={crestWatermark}
          width={520}
          height={520}
          alt=""
          style={{ position: "absolute", right: 40, bottom: 55, opacity: 0.22 }}
        />
      ) : null}

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
          {mark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} alt="" width={63} height={60} style={{ width: 63, height: 60 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
              <span style={{ color: "#ffffff" }}>{WORDMARK_A}</span>
              <span style={{ color: LIGHT_GREEN }}>{WORDMARK_B}</span>
            </div>
          )}
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
          {crests && crests.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 22 }}>
              {crests.map((src, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  {i > 0 ? (
                    <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>vs</div>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 96,
                      height: 96,
                      backgroundColor: "#ffffff",
                      borderRadius: 18,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" width={72} height={72} style={{ width: 72, height: 72, objectFit: "contain" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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
