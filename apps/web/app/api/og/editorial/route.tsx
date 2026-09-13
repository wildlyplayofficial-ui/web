import { OgCard, ogResponse, loadMarkDataUri } from "../_shared";

/**
 * Branded editorial OG card (1200×630) for utility/evergreen pages
 * (guides hub, calculators hub + individual calcs, transparency).
 * (Thẻ recap trên trang chủ đã chuyển sang /api/og/news để có logo đội — 13/9.)
 * Query params: ?title=...&subtitle=...
 * Brand-green card + banhbong.net mark — NO player, NO crests.
 * (Peter 25/8 + 13/9: đừng dán 1 cầu thủ bất kỳ — bài Ligue 1 mà ra ảnh Haaland
 *  là sai. Bài không nói về 1 cầu thủ cụ thể thì chỉ để thẻ chữ có thương hiệu.)
 */

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "banhbong.net";
  const subtitle = searchParams.get("subtitle") || null;

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
    />,
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
