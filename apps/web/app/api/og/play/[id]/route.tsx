import { getPick } from "@/lib/data";
import { formatKickoff } from "@/lib/format";
import type { Confidence } from "@/lib/types";
import { OgCard, loadTeamPlayerDataUri, ogResponse, loadMarkDataUri } from "../../_shared";

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

/** Vietnamese league names for the OG card (default: original name). */
const LEAGUE_VI: Record<string, string> = {
  "Premier League": "Ngoại hạng Anh",
  "Champions League": "Cúp C1 châu Âu",
  "Europa League": "Cúp C2 châu Âu",
  "Europa Conference League": "Cúp C3 châu Âu",
  "FA Cup": "Cúp FA",
  "EFL Cup": "Cúp Liên đoàn Anh",
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
    ? ` · ${vi ? "Mức tự tin" : "Confidence"}: ${vi ? conf.vi : conf.en}`
    : "";

  const leagueLabel = vi ? LEAGUE_VI[pick.league] ?? pick.league : pick.league;

  // Featured pick gets the club's cartoon when we have art for it — home team
  // leads, away as fallback. No art yet → text-only card (selection + odds
  // stay unchanged either way). Drop cartoons into public/og/players/<slug>.png.
  let player = await loadTeamPlayerDataUri(pick.home_team);
  if (!player) player = await loadTeamPlayerDataUri(pick.away_team);

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      eyebrow={vi ? "Trận tâm điểm" : "Featured pick"}
      title={`${pick.home_team} vs ${pick.away_team}`}
      topRight={leagueLabel}
      badge={`${pick.selection}${confText}`}
      detail={[{ label: vi ? "Khởi tranh" : "Kick-off", value: formatKickoff(pick.kickoff_utc, vi ? "vi" : "en") }]}
      player={player}
      showPlayer={Boolean(player)}
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
