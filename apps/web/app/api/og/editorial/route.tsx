import { OgCard, loadPlayerDataUri, ogResponse } from "../_shared";

/**
 * Branded editorial OG card (1200×630) for utility/evergreen pages
 * (guides hub, calculators hub + individual calcs, transparency).
 * Query params: ?title=...&subtitle=...
 * Brand-green card with the player and WildlyPlay mark — no teams/crests.
 */

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "WildlyPlay";
  const subtitle = searchParams.get("subtitle") || null;
  const player = await loadPlayerDataUri();

  return ogResponse(
    <OgCard
      eyebrow="WildlyPlay"
      title={title}
      sub={subtitle}
      footer="wildlyplay.com"
      footerRight="Handpicked plays for the global crowd"
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
