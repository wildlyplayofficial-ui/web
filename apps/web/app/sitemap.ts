import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllMatchSlugs, getAllGuideSlugs, getAllReportSlugs, getSettledPicks, isFeatureEnabled, getAllBlogSlugs} from "@/lib/data";
import { getAllAnalysisArticleSlugs, getAnalysisByTeam } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs, getNewsByTeam } from "@/lib/news";
import { TEAM_HUBS } from "@/lib/teams";
import { newsDuocIndex, analysisDuocIndex, tranDuocIndex } from "@/lib/chi-muc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { duongDanNgay, GIAI_TRANG, lechNgay } from "@/lib/du-doan-loc";
import { ngayVN } from "@/lib/du-doan-hang";
import { duDoanCua } from "@/lib/du-doan-nguon";
import { getStandingsCompetitions } from "@/lib/standings-extra";

/** SEO: mọi kèo đã chốt + bài đã đăng, chỉ bản tiếng Việt (site bỏ en/th/es từ 23/8). */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = SITE_URL;
// Chỉ còn tiếng Việt (Nick + Peter chốt 23/8) — không khai hreflang cho ngôn ngữ
// đã bỏ, nếu không Google vẫn bò /en /th /es rồi ăn 301 vô ích.
const LANGS = ["vi"] as const;

// 9/11/2026: bỏ mốc cứng VI_REPOSITION (28/7) cho trang tĩnh/trang giải. Ngày giả
// đứng yên 3 tháng làm Google thôi tin lastmod. Giờ trang mục lục lấy ngày của bài
// mới nhất bên trong; trang không có nguồn ngày thật thì KHÔNG khai lastmod.

/** lastModified không bao giờ được ở TƯƠNG LAI: trang trận lấy ngày đá làm mốc sửa,
 *  nên 203/816 URL khai ngày 24/8, 29/8… trong khi hôm nay 23/8 (kiểm 23/8/2026).
 *  Google thấy lastmod không đáng tin thì bỏ qua lastmod của CẢ sitemap, mất luôn
 *  tín hiệu "nội dung vừa cập nhật" cho những trang khai đúng. */
function safeLastMod(value: string | number | Date | null | undefined): Date {
  const d = value ? new Date(value) : new Date();
  const now = new Date();
  return Number.isNaN(d.getTime()) || d > now ? now : d;
}

/** Ngày mới nhất trong danh sách (ISO), hoặc undefined nếu không có ngày nào —
 *  khi đó trang không khai lastmod thay vì khai ngày bịa. */
function moiNhat(dates: (string | null | undefined)[]): Date | undefined {
  const ts = dates.map((d) => (d ? Date.parse(d) : NaN)).filter((t) => Number.isFinite(t));
  return ts.length ? safeLastMod(Math.max(...ts)) : undefined;
}

/** Bài có dự đoán: trận đá xong thì trang tự thêm ô kết quả cạnh ô dự đoán (v3,
 *  10/11) dù hàng CSDL không đổi → lastmod = muộn hơn giữa ngày sửa và giờ đá + 2 giờ
 *  (safeLastMod chặn tương lai, nên trận chưa đá giữ ngày sửa).
 *
 *  Chưa tách sitemap "sắp đá / đã đá" như predictz: repo chỉ có MỘT sitemap.ts (không
 *  dùng generateSitemaps) và hiện mới có 1 bài dự đoán — tách file lúc này chỉ thêm
 *  một tệp gần rỗng. Khi số bài dự đoán đủ lớn thì tách bằng generateSitemaps. */
function lastmodBaiDuDoan(slug: string, modified: string): Date {
  const ko = duDoanCua({ slug, du_doan: null })?.kickoff_utc;
  const xong = ko ? Date.parse(ko) + 2 * 3_600_000 : NaN;
  const sua = Date.parse(modified);
  // Trận chưa xong (giờ xong ở tương lai) thì KHÔNG dùng — safeLastMod sẽ kẹp về
  // "bây giờ", tức khai lastmod mới mỗi lần bò dù trang chưa đổi.
  if (!Number.isFinite(xong) || xong > Date.now() || (Number.isFinite(sua) && sua >= xong)) return safeLastMod(modified);
  return safeLastMod(xong);
}

/** Build alternates map for hreflang in sitemap — path-based URLs. */
function alternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  const clean = path === "/" ? "" : path;
  return {
    languages: Object.fromEntries(
      LANGS.map((l) => [l, l === "vi" ? `${BASE}${clean || "/"}` : `${BASE}/${l}${clean}`]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [matches, guides, blogs, reports, competitions, deskArticles, newsItems, settledPicks] = await Promise.all([getAllMatchSlugs(), getAllGuideSlugs(), getAllBlogSlugs(), getAllReportSlugs(), getStandingsCompetitions().catch(() => []), getAllAnalysisArticleSlugs(), getAllNewsItemSlugs(), getSettledPicks()]);

  // Hub theo CLB: CHỈ khai hub nào đủ bài để được index. Hub dưới ngưỡng tự đặt
  // noindex (xem doi/[slug]/page.tsx), mà khai một trang noindex vào sitemap thì
  // Search Console báo lỗi "Submitted URL marked noindex" — tự tạo lỗi cho mình.
  // Ngưỡng 12 giữ khớp MIN_INDEX bên trang hub.
  const HUB_MIN = 12;
  const hubRoutes: MetadataRoute.Sitemap = (
    await Promise.all(
      TEAM_HUBS.map(async (t) => {
        const [n, a] = await Promise.all([getNewsByTeam(t.slug, HUB_MIN), getAnalysisByTeam(t.slug, HUB_MIN)]);
        if (n.length + a.length < HUB_MIN) return null;
        // 4 hub /doi/ là nhóm URL duy nhất trong sitemap không khai lastmod (kiểm
        // 25/8). Lấy bài mới nhất của hub làm mốc — hai mảng đã xếp published_at
        // giảm dần nên phần tử đầu là bài mới nhất.
        const newest = [n[0]?.published_at, a[0]?.updated_at ?? a[0]?.published_at]
          .filter((d): d is string => Boolean(d))
          .sort()
          .pop();
        return {
          url: `${BASE}/doi/${t.slug}`,
          lastModified: safeLastMod(newest),
          changeFrequency: "daily" as const,
          priority: 0.7,
          alternates: alternates(`/doi/${t.slug}`),
        };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  // lastmod trang mục lục = ngày bài/kèo mới nhất bên trong.
  const lmPick = moiNhat(settledPicks.map((p) => p.settled_at ?? p.kickoff_utc));
  const lmAnalysis = moiNhat(deskArticles.map((a) => a.modified));
  const lmNews = moiNhat(newsItems.map((n) => n.updated));
  const lmBlog = moiNhat(blogs.map((b) => b.updated));
  const lmGuide = moiNhat(guides.map((g) => g.updated));
  const lmReport = moiNhat(reports.map((r) => r.updated));
  const lmMatch = moiNhat(matches.filter((m) => m.coBai).map((m) => m.updated));
  const lmHome = moiNhat([lmPick, lmAnalysis, lmNews, lmBlog].map((d) => d?.toISOString()));
  const LASTMOD: Record<string, Date | undefined> = {
    "": lmHome,
    "/daily-board": lmPick,
    "/track-record": lmPick,
    "/archive": lmPick,
    "/stats": lmPick,
    "/matches": lmMatch,
    "/analysis": lmAnalysis,
    "/du-doan": lmAnalysis,
    "/news": lmNews,
    "/guides": lmGuide,
    "/blog": lmBlog,
    "/transparency": lmReport,
  };

  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: BASE, changeFrequency: "daily", priority: 1, alternates: alternates("/") },
    { url: `${BASE}/daily-board`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-board") },
    // /keo RÚT khỏi sitemap 9/11: trang mỏng (~160 chữ, đo GSC 9/11 "đã thu thập –
    // chưa lập chỉ mục"). Trang vẫn sống, vẫn index/follow — chỉ thôi mời Google.
    { url: `${BASE}/daily-line`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-line") },
    { url: `${BASE}/daily-line/leaderboard`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/daily-line/leaderboard") },
    { url: `${BASE}/daily-line/archive`, changeFrequency: "daily", priority: 0.6, alternates: alternates("/daily-line/archive") },
    { url: `${BASE}/track-record`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/track-record") },
    { url: `${BASE}/learn`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/learn") },
    { url: `${BASE}/archive`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/archive") },
    { url: `${BASE}/stats`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/stats") },
    { url: `${BASE}/matches`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/matches") },
    { url: `${BASE}/competitions`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/competitions") },
    { url: `${BASE}/calculators`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators") },
    { url: `${BASE}/calculators/odds-converter`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/odds-converter") },
    { url: `${BASE}/calculators/kelly`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/kelly") },
    { url: `${BASE}/calculators/de-vig`, changeFrequency: "monthly", priority: 0.6, alternates: alternates("/calculators/de-vig") },
    { url: `${BASE}/analysis`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/analysis") },
    { url: `${BASE}/du-doan`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/du-doan") },
    { url: `${BASE}/ket-qua`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/ket-qua") },
    // /news mở lại 8/8 (bỏ 301) nhưng quên khai sitemap — Google không tự thấy (Jane 9/8)
    { url: `${BASE}/news`, changeFrequency: "hourly", priority: 0.7, alternates: alternates("/news") },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/guides") },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/blog") },
    { url: `${BASE}/transparency`, changeFrequency: "monthly", priority: 0.7, alternates: alternates("/transparency") },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8, alternates: alternates("/about") },
    // Hồ sơ tác giả (Peter chốt 15/9) — byline mọi bài trỏ về đây.
    { url: `${BASE}/tac-gia/pete-nguyen`, changeFrequency: "weekly", priority: 0.6, alternates: alternates("/tac-gia/pete-nguyen") },
    { url: `${BASE}/responsible-play`, changeFrequency: "monthly", priority: 0.3, alternates: alternates("/responsible-play") },
  ] as MetadataRoute.Sitemap).map((r) => {
    const lm = LASTMOD[r.url.slice(BASE.length)];
    return lm ? { ...r, lastModified: lm } : r;
  });

  // /play/* RÚT khỏi sitemap 9/11 (Peter duyệt GĐ1): trang kèo từng trận, đo GSC
  // 9/11 không trang nào được lập chỉ mục. Trang vẫn sống, vẫn có link nội bộ.

  // Bảng `posts` KHÔNG còn khai URL nào qua đường /analysis/{slug} nữa — biến
  // newsRoutes cũ đã xoá hẳn vì cả ba nhóm trong bảng đều có chỗ khác để đi:
  //  - bài MÁY ĐẺ thời WildlyPlay (news/analysis/preview/recap/no-play/post-mortem):
  //    tiếng Anh, mồ côi (đo 2/9: 272/418 URL bài trong sitemap không có link nội
  //    bộ nào trỏ tới), đã đặt noindex — mà khai trang noindex vào sitemap thì
  //    Search Console báo "Submitted URL marked noindex", đúng lỗi tự chuốc đã ghi
  //    ở phần hub CLB phía trên (xem lib/bai-may-de.ts);
  //  - `guide`: nhà riêng /guides + /transparency, đã bị .neq("type","guide") loại
  //    ngay trong query từ đợt dọn 13 cặp URL trùng (25/8) → guideRoutes/reportRoutes;
  //  - `blog`: nhà riêng /blog/{slug}, đã có blogRoutes khai. Khai thêm bản
  //    /analysis/{slug} là dựng lại đúng cái lỗi trùng vừa dọn cho guide — đo 2/9,
  //    3 bài blog sống ở CẢ HAI đường dẫn, cả hai đều 200 và đều tự nhận canonical
  //    về chính mình, Google tự chia phiếu giữa hai bản.
  // Bài thật vẫn vào sitemap đầy đủ qua deskRoutes (analysis_articles),
  // newsItemRoutes (news_items), guideRoutes, blogRoutes. Trang /analysis/{slug}
  // của bài blog vẫn sống bình thường, chỉ canonical về /blog/{slug} — xem
  // app/[lang]/analysis/[slug]/page.tsx.

  // Trận TƯƠNG LAI xa hơn 14 ngày chưa vào sitemap — 154 trang rỗng tháng 9 đang
  // hút crawl budget (kiểm kê 25/8). Tới gần ngày đá tự vào lại vì sitemap là
  // force-dynamic. Trận sắp đá ≤14 ngày GIỮ (nhu cầu "mấy giờ/xem ở đâu" là thật —
  // Jane 16/8 + trang top impression). Trận đã đá giữ (có tỷ số + match facts).
  const HORIZON_MS = 14 * 24 * 3600 * 1000;
  const cutoff = Date.now() + HORIZON_MS;
  // Trang trận CHỈ có trong lịch mùa (chưa pick/watching/bài) render noindex —
  // xem generateMetadata của /match/[slug]. Trước đây chúng vẫn nằm trong sitemap:
  // sitemap bảo Google "vào index", trang lại bảo "đừng". Bản xuất GSC 8/9 cho
  // thấy 318/481 trang kẹt "Discovered – currently not indexed" là /match, và
  // CẢ 481 đều còn trong sitemap với "lần thu thập cuối" TRỐNG — Google chưa
  // từng cào. Hàng đợi dài nên trang đáng cào bị xếp sau. Bỏ nhóm noindex ra để
  // dồn hạn mức cào cho trang có nội dung thật.
  //
  // 10/9/2026 — SIẾT THÊM MỘT NẤC (Peter chốt). Lọc theo `hasContent` ở trên đã
  // kéo 736 → 481, nhưng bản xuất GSC 10/9 cho thấy vẫn còn 158/191 trang /match
  // mình NỘP mà Google chưa từng cào — 83%. Giờ chỉ nộp trang CÓ BÀI VIẾT thật
  // (`coBai`); trang chỉ có pick/watching thì bỏ, vì pick đã có trang /play riêng
  // trong sitemap rồi, nộp thêm /match là nộp hai lần một nội dung.
  // Trang vẫn sống và vẫn có link nội bộ trỏ tới — chỉ thôi mời Google.
  // ⚠️ Điều kiện này PHẢI khớp với `isThin` trong /match/[slug]/page.tsx. Lệch nhau
  // là sitemap bảo "vào index" còn trang bảo "đừng" — đúng lỗi đã ghi ở trên.
  const matchRoutes: MetadataRoute.Sitemap = matches.filter((m) => {
    if (!m.coBai) return false;
    const kick = Date.parse(m.kickoffUtc);
    return Number.isNaN(kick) || kick <= cutoff;
  }).map((m) => ({
    url: `${BASE}/match/${m.slug}`,
    lastModified: safeLastMod(m.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/match/${m.slug}`),
  }));

  // 6 guide nặng thuật ngữ cá cược đặt noindex ở bản VI (Nick chốt 4/8). Trước đây
  // chúng vẫn nằm trong sitemap vì còn mang hreflang sang /en /th /es. Ba bản đó bỏ
  // từ 23/8, nên `LANGS.filter(l => l !== "vi")` ra mảng RỖNG: 6 URL này đang được
  // nộp cho Google dưới dạng URL noindex trần, không alternates (kiểm prod 26/8 —
  // đúng 6/721 URL trong sitemap không có thẻ hreflang nào). Đó là tự chuốc lỗi
  // "Submitted URL marked noindex" trong Search Console. Bỏ hẳn khỏi sitemap;
  // trang vẫn sống, vẫn follow, chỉ không nộp cho Google nữa.
  const blogRoutes: MetadataRoute.Sitemap = blogs.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: safeLastMod(b.updated),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    alternates: alternates(`/blog/${b.slug}`),
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides
    .filter((g) => !VI_BLOCKED_GUIDE_SLUGS.has(g.slug))
    .map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: safeLastMod(g.updated),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: alternates(`/guides/${g.slug}`),
    }));

  const reportRoutes: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${BASE}/transparency/${r.slug}`,
    lastModified: safeLastMod(r.updated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: alternates(`/transparency/${r.slug}`),
  }));

  // Dọn chỉ mục 9/11 (Peter chốt): chỉ nộp bài được mời index — khớp robots ở trang bài.
  const deskRoutes: MetadataRoute.Sitemap = deskArticles.filter((a) => analysisDuocIndex(a.slug, a.updated)).map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: lastmodBaiDuDoan(a.slug, a.modified),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/analysis/${a.slug}`),
  }));

  // /news article pages: only the /news index was declared (line above), never the
  // individual news_items — so every published news item (transfers, previews…) was
  // orphaned from Google despite being live. Declare each one (Jane 15/8).
  const newsItemRoutes: MetadataRoute.Sitemap = newsItems.filter((n) => newsDuocIndex(n.slug, n.updated)).map((n) => ({
    url: `${BASE}/news/${n.slug}`,
    lastModified: safeLastMod(n.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/news/${n.slug}`),
  }));

  // Trang giải + 2 trang con (lịch thi đấu, phong độ). Trước chỉ phát trang gốc nên
  // 2 trang con đã dựng xong mà Google không biết chúng tồn tại (4/8).
  // Sitemap phải soi ĐÚNG điều kiện sống của trang giải — xem
  // app/[lang]/competitions/[slug]/page.tsx: notFound() khi status khác "active"
  // VÀ cờ standings_<slug> tắt. Chỉ lọc theo status thì aff-cup/asian-cup/
  // euro-qualifiers được nộp cho Google dưới dạng 404, còn giải soft-launch bằng
  // cờ lại sống mà vắng mặt trong sitemap — hai mặt của cùng một lỗi (5/8).
  // World Cup (362) giữ trang gốc nhưng bỏ trang con: trang giải ẩn tab cho WC.
  //
  // 10/9/2026 — ĐẢO LẠI quyết định 4/8 ở trên: 2 trang con nay đặt noindex, nên
  // BỎ HẲN khỏi sitemap. Lý do đo được: 18 trang con chỉ 109-232 chữ, là bảng
  // trần không câu văn, trong khi cả site đang bị Google trả về "đã thu thập –
  // chưa lập chỉ mục" (19/459 trang còn chỉ mục, lượt hiện 103/ngày xuống 1/ngày
  // từ 4/9). Và khai URL noindex vào sitemap là tự chuốc lỗi "Submitted URL
  // marked noindex" — đúng cái lỗi đã ghi hai lần ở đầu tệp này.
  // Trang vẫn sống, vẫn follow, người dùng bấm tab vẫn xem được.
  const subPages = (_c: { livescoreId: number }) => [""];
  const visible = await Promise.all(
    competitions.map(async (c) => {
      if (!c.slug) return false;
      if (c.status === "active") return true;
      // Cờ tra theo từng giải, chỉ chạy cho số ít giải non-active. Lỗi Supabase
      // thì coi như tắt: thà thiếu một URL còn hơn hỏng cả sitemap.
      try {
        return await isFeatureEnabled(`standings_${c.slug.replace(/-/g, "_")}`);
      } catch {
        return false;
      }
    }),
  );
  const standingsRoutes: MetadataRoute.Sitemap = competitions
    .filter((_, i) => visible[i])
    .flatMap((c) =>
      subPages(c).map((sub) => ({
        url: `${BASE}/competitions/${c.slug}${sub}`,
        // Không khai lastmod: bảng điểm đổi theo trận, không có cột ngày sửa thật.
        changeFrequency: "daily" as const,
        priority: sub === "" ? 0.7 : 0.6,
        alternates: alternates(`/competitions/${c.slug}${sub}`),
      })),
    );

  // Trang riêng từng trận /du-doan/{slug} (10/11): CHỈ nộp trận được mời index — khớp
  // robots ở trang trận (tranDuocIndex). Trận đá xong trang thêm tỷ số thật → lastmod =
  // giờ đá + 2 giờ; trận chưa đá không có ngày sửa thật nên không khai lastmod.
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const tranRoutes: MetadataRoute.Sitemap = hang.filter(tranDuocIndex).map((h) => ({
    url: `${BASE}/du-doan/${h.slug}`,
    ...(h.sapDa ? {} : { lastModified: safeLastMod(Date.parse(h.kickoffUtc) + 2 * 3_600_000) }),
    changeFrequency: "daily" as const,
    priority: 0.6,
    alternates: alternates(`/du-doan/${h.slug}`),
  }));

  // Trang theo giải + theo ngày (Peter 11/11): giải luôn nộp; ngày chỉ nộp ngày có trận, mỗi link một lần.
  const homNay = ngayVN(Date.now());
  const locRoutes: MetadataRoute.Sitemap = [
    ...GIAI_TRANG.map((g) => `/du-doan/${g.slug}`),
    ...[...new Set(hang.map((h) => h.ngay).filter((n) => n > homNay && n <= lechNgay(homNay, 6)).map((n) => duongDanNgay(n, homNay)))],
  ].map((p) => ({ url: `${BASE}${p}`, changeFrequency: "daily" as const, priority: 0.6, alternates: alternates(p) }));

  return [...staticRoutes, ...hubRoutes, ...newsItemRoutes, ...deskRoutes, ...guideRoutes, ...blogRoutes, ...reportRoutes, ...matchRoutes, ...tranRoutes, ...locRoutes, ...standingsRoutes];
}
