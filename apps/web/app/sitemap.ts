import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllMatchSlugs, getAllGuideSlugs, getAllReportSlugs, getSettledPicks, isFeatureEnabled, getAllBlogSlugs} from "@/lib/data";
import { getAllAnalysisArticleSlugs, getAnalysisByTeam } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs, getNewsByTeam } from "@/lib/news";
import { TEAM_HUBS } from "@/lib/teams";
import { newsDuocIndex, analysisDuocIndex, tranDuocIndex, NHOM_SITEMAP, type NhomSitemap } from "@/lib/chi-muc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { duongDanNgay, GIAI_TRANG, lechNgay } from "@/lib/du-doan-loc";
import { ngayVN } from "@/lib/du-doan-hang";
import { duDoanCua } from "@/lib/du-doan-nguon";
import { getStandingsCompetitions } from "@/lib/standings-extra";

/** SEO: mọi kèo đã chốt + bài đã đăng, chỉ bản tiếng Việt (site bỏ en/th/es từ 23/8).
 *
 *  12/11/2026 — TÁCH NHÓM bằng generateSitemaps: /sitemap/static.xml, /sitemap/blog.xml,
 *  /sitemap/analysis.xml, /sitemap/news.xml, /sitemap/du-doan.xml — Search Console đếm
 *  "đã lập chỉ mục" riêng từng nhóm, nhìn ra nhóm nào Google bỏ. Next KHÔNG tự sinh mục
 *  lục khi dùng generateSitemaps, nên /sitemap.xml (robots.txt trỏ vào) là route riêng
 *  app/sitemap.xml/route.ts liệt kê 5 tệp trên. Nhóm `static` gồm trang tĩnh + mục lục
 *  nhỏ (hub /doi, /guides, /transparency, /competitions, /match có bài). */

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
 *  (safeLastMod chặn tương lai, nên trận chưa đá giữ ngày sửa). */
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

export async function generateSitemaps(): Promise<{ id: NhomSitemap }[]> {
  return NHOM_SITEMAP.map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const nhom = await id;
  if (nhom === "blog") return nhomBlog();
  if (nhom === "analysis") return nhomAnalysis();
  if (nhom === "news") return nhomNews();
  if (nhom === "du-doan") return nhomDuDoan();
  return nhomStatic();
}

async function nhomBlog(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getAllBlogSlugs();
  return blogs.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: safeLastMod(b.updated),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    alternates: alternates(`/blog/${b.slug}`),
  }));
}

// Dọn chỉ mục 9/11 (Peter chốt): chỉ nộp bài được mời index — khớp robots ở trang bài.
async function nhomAnalysis(): Promise<MetadataRoute.Sitemap> {
  const deskArticles = await getAllAnalysisArticleSlugs();
  return deskArticles.filter((a) => analysisDuocIndex(a.slug, a.updated)).map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: lastmodBaiDuDoan(a.slug, a.modified),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/analysis/${a.slug}`),
  }));
}

// /news article pages: only the /news index was declared, never the individual
// news_items — so every published news item (transfers, previews…) was orphaned
// from Google despite being live. Declare each one (Jane 15/8).
// 12/11: tin mỏng (< NEWS_TOI_THIEU_CHU chữ thân bài) không nộp — trang tự noindex.
async function nhomNews(): Promise<MetadataRoute.Sitemap> {
  const newsItems = await getAllNewsItemSlugs();
  return newsItems.filter((n) => newsDuocIndex(n.slug, n.updated, n.soChu)).map((n) => ({
    url: `${BASE}/news/${n.slug}`,
    lastModified: safeLastMod(n.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/news/${n.slug}`),
  }));
}

async function nhomDuDoan(): Promise<MetadataRoute.Sitemap> {
  // Trang riêng từng trận /du-doan/{slug} (10/11): CHỈ nộp trận được mời index — khớp
  // robots ở trang trận (tranDuocIndex: giải lớn/đội tuyển/Việt Nam, và từ 12/11 loại
  // hẳn trang khuôn từ tệp tuần `tuan-…`, chỉ còn bài tay `nhan-dinh-…`). Trận đá xong
  // trang thêm tỷ số thật → lastmod = giờ đá + 2 giờ; trận chưa đá không có ngày sửa
  // thật nên không khai lastmod.
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

  return [...tranRoutes, ...locRoutes];
}

async function nhomStatic(): Promise<MetadataRoute.Sitemap> {
  // Bài/tin/blog chỉ lấy NGÀY để tính lastmod trang mục lục — URL của chúng nằm ở nhóm riêng.
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

  // Bảng `posts` KHÔNG còn khai URL nào qua đường /analysis/{slug} nữa — bài máy đẻ
  // thời WildlyPlay đã noindex (lib/bai-may-de.ts); `guide` có nhà riêng /guides;
  // `blog` có nhà riêng /blog/{slug} (khai thêm /analysis/{slug} là dựng lại lỗi trùng
  // dọn 25/8 — xem app/[lang]/analysis/[slug]/page.tsx, canonical về /blog).

  // Trận TƯƠNG LAI xa hơn 14 ngày chưa vào sitemap — 154 trang rỗng tháng 9 đang
  // hút crawl budget (kiểm kê 25/8). Tới gần ngày đá tự vào lại vì sitemap là
  // force-dynamic. Trận đã đá giữ (có tỷ số + match facts).
  const HORIZON_MS = 14 * 24 * 3600 * 1000;
  const cutoff = Date.now() + HORIZON_MS;
  // 10/9/2026 (Peter chốt): chỉ nộp trang /match CÓ BÀI VIẾT thật (`coBai`); trang chỉ
  // có pick/watching đã có /play riêng, nộp thêm /match là nộp hai lần. Bản xuất GSC
  // 8/9: 318/481 trang kẹt "Discovered – currently not indexed" là /match.
  // ⚠️ Điều kiện này PHẢI khớp với `isThin` trong /match/[slug]/page.tsx. Lệch nhau
  // là sitemap bảo "vào index" còn trang bảo "đừng".
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

  // 6 guide nặng thuật ngữ cá cược đặt noindex ở bản VI (Nick chốt 4/8) — bỏ hẳn khỏi
  // sitemap (kiểm prod 26/8: nộp URL noindex trần là tự chuốc lỗi "Submitted URL
  // marked noindex"). Trang vẫn sống, vẫn follow.
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

  // Trang giải: sitemap phải soi ĐÚNG điều kiện sống của trang giải — xem
  // app/[lang]/competitions/[slug]/page.tsx: notFound() khi status khác "active"
  // VÀ cờ standings_<slug> tắt (5/8). 10/9/2026: 2 trang con (lịch, phong độ) đặt
  // noindex nên BỎ HẲN khỏi sitemap (18 trang con chỉ 109-232 chữ, bảng trần).
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

  return [...staticRoutes, ...hubRoutes, ...guideRoutes, ...reportRoutes, ...matchRoutes, ...standingsRoutes];
}
