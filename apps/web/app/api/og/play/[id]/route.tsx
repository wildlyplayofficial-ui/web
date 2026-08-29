import { getPick } from "@/lib/data";
import { teamBadge } from "@/lib/team-badges";
import type { Confidence } from "@/lib/types";
import { loadTeamPlayerDataUri, ogResponse, loadMarkDataUri, loadBadgeDataUri } from "../../_shared";
import { TheTranPick } from "./card";

/**
 * Thẻ chia sẻ (PNG 1200x630) cho pick — KHUÔN Peter chốt 21/8.
 * Đây là thẻ worker gắn vào tin Telegram/Facebook sau khi anh Nick gõ /pick,
 * nên nó phải giống hệt bản dựng tay ở tools/watchlist/tao-the-pick.py.
 * 404 chỉ khi không có pick.
 */

/** Ba mức Nick chốt 21/8 — ghi VỪA, KHÔNG ghi "Trung bình". */
const CONF_VI: Record<Confidence, string> = { low: "THẤP", medium: "VỪA", high: "CAO" };

const LEAGUE_VI: Record<string, string> = {
  "Premier League": "Ngoại hạng Anh",
  "Champions League": "Cúp C1 châu Âu",
  "Europa League": "Cúp C2 châu Âu",
  "Europa Conference League": "Cúp C3 châu Âu",
  "FA Cup": "Cúp FA",
  "EFL Cup": "Cúp Liên đoàn Anh",
};

/** Tên giải tiếng Việt, GIỮ phần mùa nếu có.
 *  Kho ghi kèm mùa ("Premier League 2026-27") nên khớp chữ cứng là trượt —
 *  thẻ đầu tiên chạy thật 29/8 in ra "Premier League 2026-27" tiếng Anh.
 *  Cắt phần mùa ra, đổi tên giải, rồi ghép lại. */
function tenGiai(raw: string): string {
  const m = raw.match(/^(.*?)\s*((?:19|20)\d{2}(?:[-/]\d{2,4})?)$/);
  const ten = (m ? m[1] : raw).trim();
  const mua = m ? ` ${m[2]}` : "";
  return `${LEAGUE_VI[ten] ?? ten}${mua}`;
}

/** "29/08 · 18:30" theo giờ VN — bản Python in đúng kiểu này. */
function gioVN(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}/${g("month")} · ${g("hour")}:${g("minute")}`;
}

/** 0.25 -> "0,25" — dấu phẩy thập phân như bản Python. */
function donVi(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return String(n).replace(".", ",");
}

async function crest(team: string): Promise<string | null> {
  const url = teamBadge(team);
  return url ? loadBadgeDataUri(url) : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const pick = await getPick(id);
  if (!pick) return new Response("Not found", { status: 404 });

  const published = pick.status === "published";

  // Ảnh cầu thủ: ưu tiên đội nhà, không có thì đội khách. Thiếu cả hai thì thẻ
  // vẫn ra, chỉ trống nửa phải — không chặn việc đăng.
  let player = await loadTeamPlayerDataUri(pick.home_team);
  if (!player) player = await loadTeamPlayerDataUri(pick.away_team);

  const [mark, huyHieuNha, huyHieuKhach] = await Promise.all([
    loadMarkDataUri(),
    crest(pick.home_team),
    crest(pick.away_team),
  ]);

  return ogResponse(
    TheTranPick({
      giai: tenGiai(pick.league),
      doiNha: pick.home_team,
      doiKhach: pick.away_team,
      duDoan: pick.selection,
      mucTuTin: pick.confidence ? CONF_VI[pick.confidence] : null,
      donVi: donVi(pick.stake_units),
      gioDa: gioVN(pick.kickoff_utc),
      huyHieuNha,
      huyHieuKhach,
      anhCauThu: player,
      logo: mark,
    }) as React.ReactElement,
    {
      headers: {
        "Cache-Control": published
          ? "public, max-age=60, s-maxage=120"
          : "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
