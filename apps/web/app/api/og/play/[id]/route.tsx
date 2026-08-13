import { getPick } from "@/lib/data";
import { formatKickoff } from "@/lib/format";
import type { Confidence } from "@/lib/types";
import { OgCard, ogResponse } from "../../_shared";

/**
 * Share image (PNG 1200x630) for ANY non-draft pick. This is the ONLY card type
 * that surfaces the pick/selection — the featured play. Teams headline, the
 * selection + pre-registered confidence in a gold badge, league + kickoff.
 * 404 only when the pick doesn't exist.
 */

const CONF_LABEL: Record<Confidence, { en: string; vi: string }> = {
  low: { en: "Low", vi: "Thấp" },
  medium: { en: "Medium", vi: "Trung bình" },
  high: { en: "High", vi: "Cao" },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const pick = await getPick(id);
  if (!pick) {
    return new Response("Not found", { status: 404 });
  }

  const vi = new URL(request.url).searchParams.get("lang") === "vi";
  const published = pick.status === "published";

  const conf = pick.confidence ? CONF_LABEL[pick.confidence] : null;
  const confText = conf
    ? ` · ${vi ? "Độ tự tin" : "Confidence"}: ${vi ? conf.vi : conf.en}`
    : "";

  return ogResponse(
    <OgCard
      eyebrow={vi ? "Kèo tâm điểm" : "Featured pick"}
      title={`${pick.home_team} vs ${pick.away_team}`}
      topRight={pick.league}
      badge={`${pick.selection}${confText}`}
      detail={[{ label: vi ? "Khởi tranh" : "Kick-off", value: formatKickoff(pick.kickoff_utc, vi ? "vi" : "en") }]}
    />,
    {
      headers: {
        // Short cache while published (status changes), longer once settled.
        "Cache-Control": published
          ? "public, max-age=60, s-maxage=120"
          : "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
