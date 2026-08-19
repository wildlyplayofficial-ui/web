import { getTrackRecordForAuthor } from "@/lib/data";
import { OgCard, loadPlayerDataUri, ogResponse, loadMarkDataUri } from "../_shared";

/**
 * Home share image (PNG 1200x630): brand-green card with the live Curator record.
 * Client requirement (§firewall): the home card shows the TRACK RECORD, never a
 * specific pick/match. Curator-only (never blend Scout).
 */

export async function GET(request: Request): Promise<Response> {
  const vi = new URL(request.url).searchParams.get("lang") === "vi";
  const record = await getTrackRecordForAuthor("curator");
  const player = await loadPlayerDataUri();

  const pl = `${record.units_pl > 0 ? "+" : ""}${record.units_pl}u`;
  const hitRate = record.settled > 0 ? `${Math.round((record.wins / record.settled) * 100)}%` : "—";

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow={vi ? "Phân tích & dự đoán bóng đá" : "Football analysis & predictions"}
      title={vi ? "Nhận định miễn phí, chỉ khi có lợi thế" : "Free analysis, only when there's an edge"}
      titleFontSize={vi ? 52 : 54}
      sub={vi ? "Một trận. Một góc nhìn." : "One match. One angle."}
      chips={[
        { value: `${record.wins}-${record.losses}-${record.pushes}`, label: vi ? "Thành tích" : "Record" },
        { value: pl, label: vi ? "Lợi nhuận" : "Profit" },
        { value: hitRate, label: vi ? "Tỷ lệ thắng" : "Win rate" },
      ]}
      player={player}
      showPlayer
    />,
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
