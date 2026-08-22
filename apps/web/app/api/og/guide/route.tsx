import { OgCard, loadPlayerDataUri, ogResponse, loadMarkDataUri } from "../_shared";

/**
 * Guide/calculator OG card (1200×630) — branded green card with the player and
 * a topic-specific anchor line (the concept-viz in text form).
 * Query params: ?title=...&anchor=...&slug=...&type=guide|calculator
 */

/** Per-slug anchor data — the "concept diagram" as a text data-viz. */
const ANCHORS: Record<string, { anchor: string; badge: string }> = {
  // Guides
  "what-is-asian-handicap": { anchor: "-0.5  ·  -0.75  ·  -1.0  ·  -1.5", badge: "GUIDE" },
  "how-de-vigging-works": { anchor: "110 / -110  →  remove vig  →  50.0% true prob", badge: "GUIDE" },
  "what-is-devigging": { anchor: "Odds 1.91 / 1.91  →  remove vig  →  fair 2.00 / 2.00", badge: "GUIDE" },
  "what-is-closing-line-value": { anchor: "Open 2.10  →  Close 1.95  =  CLV +7.7%", badge: "GUIDE" },
  "kelly-criterion-betting": { anchor: "f* = (bp − q) / b  →  optimal stake", badge: "GUIDE" },
  "what-is-value-betting": { anchor: "Model 55%  vs  Implied 48%  =  +7% edge", badge: "GUIDE" },
  "how-to-read-betting-odds": { anchor: "2.50  =  +150  =  6/4  =  HK 1.50", badge: "GUIDE" },
  "odds-formats-explained": { anchor: "Decimal  ·  American  ·  Fractional  ·  Malay", badge: "GUIDE" },
  "what-makes-a-good-tipster": { anchor: "Record  ·  CLV  ·  Reasoning  ·  Transparency", badge: "GUIDE" },
  "no-play-discipline": { anchor: "Evaluated  →  No edge found  →  PASS", badge: "GUIDE" },
  "responsible-play-guide": { anchor: "Set limits  ·  Never chase  ·  Stay in control", badge: "GUIDE" },
  // Calculators
  "de-vig": { anchor: "Home 1.85  ·  Away 2.05  →  True: 52.6% / 47.4%", badge: "CALCULATOR" },
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
  const player = await loadPlayerDataUri();

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow={badge}
      title={title}
      noteBox={anchor || null}
      footer="banhbong.net"
      footerRight="Free betting education"
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
