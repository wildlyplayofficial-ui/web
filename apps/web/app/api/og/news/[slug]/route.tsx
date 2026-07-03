import { ImageResponse } from "next/og";
import { getPost } from "@/lib/data";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * Shows the article title, type badge, and WildlyPlay branding.
 */

const C = {
  bg: "#0d1117",
  ink: "#e6edf3",
  muted: "#8b949e",
  line: "#30363d",
  brand: "#00e676",
  scout: "#5f9c99",
} as const;

const TYPE_LABELS: Record<string, string> = {
  preview: "PRE-MATCH PREVIEW",
  recap: "MATCH RECAP",
  analysis: "ANALYSIS",
  news: "NEWS",
  "post-mortem": "POST-MORTEM",
  "no-play": "NO PLAY",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const post = await getPost(slug, "en");
  if (!post) return new Response("Not found", { status: 404 });

  const typeLabel = TYPE_LABELS[post.type] ?? post.type.toUpperCase();
  const title = post.meta_title ?? post.title;
  const titleSize = title.length > 60 ? 42 : title.length > 40 ? 48 : 56;
  const accent = post.author === "scout" ? C.scout : C.brand;

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
              color: accent,
              border: `2px solid ${accent}`,
              borderRadius: 10,
              padding: "6px 20px",
            }}
          >
            {typeLabel}
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
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            {title}
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
          {post.author === "scout"
            ? "WildlyPlay · The Scout — AI-picked plays, not a real person"
            : "WildlyPlay · The Curator — Handpicked plays for the global crowd"}
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
