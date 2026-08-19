import { getTrackRecordForAuthor } from "@/lib/data";
import { OgCard, loadPlayerDataUri, ogResponse, loadMarkDataUri } from "../_shared";

/**
 * Data-hub OG card (1200×630) — brand-green card with the live Curator record.
 * Used for /archive and /stats pages. Track-record focus (never a single pick).
 * Query param: ?page=archive|stats (changes eyebrow + subtitle).
 */

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "archive";
  const stats = page === "stats";

  const curator = await getTrackRecordForAuthor("curator");
  const player = await loadPlayerDataUri();

  const asOf = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const pl = `${curator.units_pl > 0 ? "+" : ""}${curator.units_pl}u`;
  const hitRate = curator.settled > 0 ? `${Math.round((curator.wins / curator.settled) * 100)}%` : "—";

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow="Public track record"
      title={stats ? "Statistics" : "Track Record"}
      sub={
        stats
          ? "ROI, CLV and calibration by league and market"
          : "Every pick, public forever. We post our losses too."
      }
      chips={[
        { value: `${curator.wins}-${curator.losses}-${curator.pushes}`, label: "Record" },
        { value: pl, label: "Profit" },
        { value: hitRate, label: "Win rate" },
      ]}
      footerRight={`${curator.settled} settled · as of ${asOf}`}
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
