import { OgCard, loadPlayerDataUri, ogResponse } from "../_shared";

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

  return ogResponse(
    <OgCard
      eyebrow="banhbong.net"
      title={title}
      sub={subtitle}
      footer="banhbong.net"
      footerRight="Handpicked plays for the global crowd"
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
