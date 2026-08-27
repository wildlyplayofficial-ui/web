import { getPost } from "@/lib/data";
import { getHeadline, getNewsItemBySlug } from "@/lib/news";
import { resolveLang, type Lang } from "@/lib/i18n";
import {
  OgCard, ogResponse, loadMarkDataUri,
  loadTeamPlayerDataUri, loadBadgeDataUri,
} from "../../_shared";
import { teamBadge } from "@/lib/team-badges";

/**
 * Dynamic share image (PNG 1200x630) for news/article pages.
 * FALLBACK card: pages prefer a hero_image, so keep it branded/generic-title
 * (headline + kind). Fallback chain: posts table → news_items table → 404.
 *
 * `?locale=` (en|vi|th|es) picks the language — without it a VI page shared an
 * EN card (Nick 21/8). Missing/unknown locale falls back to the site default (vi).
 */

const TYPE_STATUS: Record<string, string> = {
  preview: "PREVIEW",
  result: "RESULT",
  standings: "STANDINGS",
  recap: "RECAP",
  analysis: "ANALYSIS",
  news: "NEWS",
  transfer: "TRANSFER",
  "no-play": "NO PLAY",
  "post-mortem": "POST-MORTEM",
  guide: "GUIDE",
};

/** VI eyebrow overrides — the VN market reads these on every share card. */
const TYPE_STATUS_VI: Record<string, string> = {
  preview: "TRƯỚC TRẬN",
  result: "KẾT QUẢ",
  standings: "BẢNG XẾP HẠNG",
  recap: "NHÌN LẠI",
  analysis: "NHẬN ĐỊNH",
  news: "TIN TỨC",
  transfer: "CHUYỂN NHƯỢNG",
  "no-play": "BỎ QUA",
  "post-mortem": "MỔ XẺ",
  guide: "HƯỚNG DẪN",
};

function typeLabel(type: string, lang: Lang): string {
  if (lang === "vi" && TYPE_STATUS_VI[type]) return TYPE_STATUS_VI[type];
  return TYPE_STATUS[type] ?? type.toUpperCase();
}

/** CLB có logo trong bộ 192, xếp tên DÀI trước để "Manchester United" không bị
 *  "Manchester City" cướp khi dò chuỗi. Chỉ dùng làm huy hiệu nền, KHÔNG dùng
 *  để chọn ảnh người. */
const TEN_CLB = [
  "Manchester United", "Manchester City", "Tottenham Hotspur", "Nottingham Forest",
  "Crystal Palace", "Aston Villa", "Real Madrid", "Atletico Madrid",
  "Inter Miami", "Liverpool", "Barcelona", "Arsenal", "Chelsea", "Everton",
  "Fulham", "Juventus", "Napoli", "Milan", "Ajax", "Benfica",
  // Đã bỏ PSG, Bayern Munich, Porto: KHÔNG có trong bộ 192 logo nên tra ra rỗng,
  // ba dòng chết. Jane rà ra 27/8.
];

/** Tách MỘT khúc tiêu đề ở " vs " / " gặp " / " - ", trả cặp tên hoặc rỗng. */
function tachCap(than: string): string[] {
  const m = than.match(/^\s*(.+?)\s+(?:vs\.?|v\.?|gặp|-|–)\s+(.+?)\s*$/i);
  if (!m) return [];
  const doi = [m[1], m[2]]
    .map((t) => t.replace(/\s*\(.*?\)\s*/g, " ").trim())
    .filter((t) => t.length >= 2 && t.length <= 40);
  return doi.length === 2 ? doi : [];
}

/** Bóc tên hai đội ra khỏi tiêu đề: "Nhận định: Chelsea vs Luton Town" → 2 tên.
 *  Tiêu đề thật có HAI kiểu: cặp đội nằm SAU dấu hai chấm ("Nhận định: A vs B")
 *  và cặp đội nằm TRƯỚC ("A vs B: Chú Tám không chọn trận"). Bản cũ chỉ đọc
 *  phía sau nên kiểu thứ hai mất cặp đội, rơi xuống nhánh huy hiệu nền và dán
 *  MỘT logo lên thẻ trận hai đội — đúng cái luật ngay dưới đây cấm. Đo trên 35
 *  og:title thật của banhbong.net: 5/35 thẻ dính, ví dụ "Fulham vs Chelsea: Chú
 *  Tám Banh không chọn trận vì không có cơ sở" chỉ ra mỗi logo Chelsea.
 *  Nên thử CẢ HAI phía, ưu tiên phía tra được huy hiệu cho CẢ HAI tên; không
 *  phía nào tra đủ thì lấy cặp khớp đầu tiên (giữ nguyên nết cũ).
 *  Không khớp thì trả mảng rỗng — thẻ vẫn dựng được, chỉ là không có ảnh đội. */
function bocTenDoi(title: string): string[] {
  const i = title.indexOf(":");
  const khuc = i >= 0 ? [title.slice(i + 1), title.slice(0, i)] : [title];
  let duPhong: string[] = [];
  for (const than of khuc) {
    const doi = tachCap(than);
    if (doi.length !== 2) continue;
    if (doi.every((t) => teamBadge(t))) return doi;
    if (duPhong.length === 0) duPhong = doi;
  }
  return duPhong;
}

async function card(
  headline: string,
  type: string,
  lang: Lang,
  headers: Record<string, string>,
): Promise<Response> {
  // Thẻ cũ chỉ có nền xanh + một dòng chữ: đo bằng tools/do-thumbnail.py ra
  // 87,6% vùng phẳng / 71,1% ô giữa, ngưỡng là 55/60 — rớt nặng, và là ảnh
  // trống nhất trong bộ. Peter chỉ ra 27/8. Lấp bằng thứ ĐÃ CÓ SẴN trong repo:
  // cartoon riêng của đội (20 tệp) và logo CLB (192 tệp).
  const teams = bocTenDoi(headline);

  // Cartoon CHỈ dùng cho bài về TRẬN ĐẤU (tiêu đề dạng "A vs B").
  //
  // Peter loại 27/8: bài "Liverpool nối lại đàm phán với PSG cho Bradley Barcola"
  // ra ảnh một cầu thủ Liverpool khác. Bài nói về Barcola — người trong ảnh
  // KHÔNG phải người bài đang nói tới. Vẫn là ảnh nói dối, chỉ tinh vi hơn ca
  // dán cầu thủ Man City lên bài Liverpool.
  //
  // Bài chuyển nhượng, bài giải thưởng, bài tin chung đều nói về MỘT NGƯỜI cụ
  // thể. Dán cầu thủ bất kỳ cùng CLB vào là sai người. Không có ảnh đúng người
  // thì để thẻ chữ — nền đã có hoạ tiết nên không trống.
  let player: string | null = null;
  for (const t of teams) {
    player = await loadTeamPlayerDataUri(t);
    if (player) break;
  }

  // Logo: CHỈ hiện khi tra được CẢ HAI đội. Hiện mỗi một logo trong trận hai đội
  // trông như thiên vị, thà không hiện.
  let crests: string[] | null = null;
  if (teams.length === 2) {
    const urls = teams.map(teamBadge);
    if (urls.every(Boolean)) {
      const loaded = (await Promise.all(urls.map((u) => loadBadgeDataUri(u!))))
        .filter((x): x is string => Boolean(x));
      if (loaded.length === 2) crests = loaded;
    }
  }

  // Không có cartoon (bài không phải trận đấu) thì lấp bằng HUY HIỆU CLB phóng
  // to, mờ. Bài nhắc CLB nào thì hiện CLB đó — trung thực, và lấp được mảng
  // trống 86,8% của thẻ chữ trơn.
  // ⚠️ ĐIỀU KIỆN PHẢI CÓ CẢ `!crests`, không chỉ `!player`.
  // Jane rà ra 27/8: bài "Nhận định: Real Madrid vs Barcelona" — bộ 20 cartoon
  // không có đội nào của La Liga nên không có ảnh người, nhưng bộ 192 logo có
  // CẢ HAI đội nên cặp logo nhỏ hiện lên. Rồi nhánh này chỉ hỏi "có người
  // không", thấy không nên dán thêm huy hiệu Real Madrid TO MỜ phía sau.
  // Ra thẻ: hai logo cân nhau + một huy hiệu Real Madrid to đùng — đúng cái
  // thiên vị luật ngay dưới đây cấm, và rơi vào trận to nhất năm.
  let crestWatermark: string | null = null;
  if (!player && !crests) {
    const clb = TEN_CLB.find((d) => headline.toLowerCase().includes(d.toLowerCase()));
    const url = clb ? teamBadge(clb) : null;
    if (url) crestWatermark = await loadBadgeDataUri(url);
  }

  const mark = await loadMarkDataUri();
  return ogResponse(
    <OgCard
      mark={mark}
      crestWatermark={crestWatermark}
      eyebrow={typeLabel(type, lang)}
      title={headline}
      crests={crests}
      player={player}
      showPlayer={Boolean(player)}
      footer="banhbong.net"
      footerRight="banhbong.net News"
    />,
    { headers },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };
  const lang = resolveLang(new URL(request.url).searchParams.get("locale") ?? undefined);

  // getPost falls back to the EN row when the language is missing.
  const post = await getPost(slug, lang);
  if (post) {
    return card(post.meta_title ?? post.title, post.type, lang, headers);
  }

  // Fallback: news_items table (auto-gen preview/result/standings)
  const newsItem = await getNewsItemBySlug(slug);
  if (!newsItem) return new Response("Not found", { status: 404 });

  return card(getHeadline(newsItem, lang), newsItem.type, lang, headers);
}
