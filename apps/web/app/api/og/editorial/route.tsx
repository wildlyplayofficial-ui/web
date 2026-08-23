import { OgCard, loadPlayerDataUri, ogResponse, loadMarkDataUri } from "../_shared";

/**
 * Branded editorial OG card (1200×630) for utility/evergreen pages
 * (guides hub, calculators hub + individual calcs, transparency).
 * Query params: ?title=...&subtitle=...
 * Brand-green card with the player and banhbong.net mark — no teams/crests.
 */

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "banhbong.net";
  const subtitle = searchParams.get("subtitle") || null;
  const player = await loadPlayerDataUri();

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow="banhbong.net"
      title={title}
      sub={subtitle}
      footer="banhbong.net"
      // Site chỉ còn tiếng Việt (Nick chốt 22/8) — dòng tiếng Anh này vẫn
      // đang hiện trên thẻ chia sẻ của bài tiếng Việt (Nick chỉ ra 23/8).
      footerRight="Nhận định bóng đá, phân tích bằng số liệu"
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
