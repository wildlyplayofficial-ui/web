import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllGuideSlugs, getSettledPicks, isFeatureEnabled, getAllBlogSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs, getAnalysisByTeam } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs, getNewsByTeam } from "@/lib/news";
import { TEAM_HUBS } from "@/lib/teams";
import { analysisDuocIndex, analysisVaoSitemap, blogVaoSitemap, doiDuocIndex, guideDuocIndex, tranDuocIndex, GIAI_BXH_SITEMAP, GIAI_DU_DOAN_SITEMAP, SO_NGAY_TRAN_SITEMAP, NHOM_SITEMAP, type NhomSitemap } from "@/lib/chi-muc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { GIAI_TRANG, lechNgay } from "@/lib/du-doan-loc";
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
 *  nhỏ (hub /doi, /guides, /competitions, /match có bài, công cụ). 14/11 Peter: "không gỡ,
 *  gom lại, index toàn trang" — nộp lại các trang PR #323 rút, trừ trang thành tích
 *  noindex và /daily-line (301).
 *
 *  14/11/2026 (sau đó) — GỌN SITEMAP, Peter chốt: GSC hiện 754 (T8) → 8 (T11), Google bỏ
 *  chỉ mục gần hết. Thôi nộp trang khuôn; 202 URL rút còn ~60 trang đáng index (luật nằm
 *  trong lib/chi-muc.ts). Trang khuôn mỏng rút ra thì tự noindex,follow ở metadata. */

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
  // 14/11 gọn sitemap: bỏ lịch cuối tuần đã qua + ASEAN Cup 2026 đã xong (bài vẫn index).
  const blogs = await getAllBlogSlugs();
  return blogs.filter((b) => blogVaoSitemap(b.slug)).map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: safeLastMod(b.updated),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    alternates: alternates(`/blog/${b.slug}`),
  }));
}

// Dọn chỉ mục 9/11 (Peter chốt): chỉ nộp bài được mời index — khớp robots ở trang bài.
// 14/11 gọn sitemap: chỉ nộp nhóm "xem … ở đâu"; bài lịch/mấy giờ/nhận định vẫn index nhưng thôi mời.
async function nhomAnalysis(): Promise<MetadataRoute.Sitemap> {
  const deskArticles = await getAllAnalysisArticleSlugs();
  return deskArticles.filter((a) => analysisDuocIndex(a.slug, a.updated) && analysisVaoSitemap(a.slug)).map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: lastmodBaiDuDoan(a.slug, a.modified),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/analysis/${a.slug}`),
  }));
}

// /news: 14/11 gọn sitemap — tin ~400 chữ, phần lớn là tin chuyển nhượng hè đã cũ. Tin mới
// (48 giờ) đã nằm trong /news-sitemap.xml, nên nhóm này để RỖNG (giữ tệp để URL đã nộp GSC
// không thành 404). Luật index từng tin không đổi (newsDuocIndex ở trang tin).
async function nhomNews(): Promise<MetadataRoute.Sitemap> {
  return [];
}

async function nhomDuDoan(): Promise<MetadataRoute.Sitemap> {
  // Trang riêng từng trận /du-doan/{slug} (10/11): CHỈ nộp trận được mời index — khớp
  // robots ở trang trận (tranDuocIndex: giải lớn/đội tuyển/Việt Nam, bỏ trang khuôn `tuan-…`).
  // 14/11 gọn sitemap (Peter chốt): chỉ trận đá trong SO_NGAY_TRAN_SITEMAP ngày tới (giờ VN,
  // tính cả hôm nay); trận đã qua hoặc còn xa vẫn sống, vẫn theo robots cũ, chỉ thôi mời.
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const homNay = ngayVN(Date.now());
  const hanCuoi = lechNgay(homNay, SO_NGAY_TRAN_SITEMAP);
  const tranRoutes: MetadataRoute.Sitemap = hang
    .filter((h) => tranDuocIndex(h) && h.ngay >= homNay && h.ngay <= hanCuoi)
    .map((h) => ({
      url: `${BASE}/du-doan/${h.slug}`,
      ...(h.sapDa ? {} : { lastModified: safeLastMod(Date.parse(h.kickoffUtc) + 2 * 3_600_000) }),
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: alternates(`/du-doan/${h.slug}`),
    }));

  // Trang dự đoán theo giải: chỉ 5 giải lớn + Cúp C1. Trang khuôn (kèo xiên, tip theo
  // ngày/loại kèo/giải, hôm nay/ngày mai, chuỗi, đội phong độ, /du-doan/{ngày}) rút hết
  // khỏi sitemap 14/11 và tự đặt noindex,follow ở metadata của từng trang.
  const giaiRoutes: MetadataRoute.Sitemap = GIAI_TRANG.filter((g) => GIAI_DU_DOAN_SITEMAP.has(g.slug)).map((g) => ({
    url: `${BASE}/du-doan/${g.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
    alternates: alternates(`/du-doan/${g.slug}`),
  }));

  return [...tranRoutes, ...giaiRoutes];
}

async function nhomStatic(): Promise<MetadataRoute.Sitemap> {
  // Bài/tin/blog chỉ lấy NGÀY để tính lastmod trang mục lục — URL của chúng nằm ở nhóm riêng.
  const [guides, blogs, competitions, deskArticles, newsItems, settledPicks] = await Promise.all([getAllGuideSlugs(), getAllBlogSlugs(), getStandingsCompetitions().catch(() => []), getAllAnalysisArticleSlugs(), getAllNewsItemSlugs(), getSettledPicks()]);

  // Hub theo đội: 14/11 chỉ hub Việt Nam (doiDuocIndex) — hub CLB là danh sách link mỏng,
  // trang tự noindex. Vẫn giữ ngưỡng HUB_MIN = MIN_INDEX bên trang hub (khớp robots).
  const HUB_MIN = 12;
  const hubRoutes: MetadataRoute.Sitemap = (
    await Promise.all(
      TEAM_HUBS.filter((t) => doiDuocIndex(t.slug)).map(async (t) => {
        const [n, a] = await Promise.all([getNewsByTeam(t.slug, HUB_MIN), getAnalysisByTeam(t.slug, HUB_MIN)]);
        if (n.length + a.length < HUB_MIN) return null;
        // Lấy bài mới nhất của hub làm mốc — hai mảng đã xếp published_at giảm dần.
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
  const lmHome = moiNhat([lmPick, lmAnalysis, lmNews, lmBlog].map((d) => d?.toISOString()));
  const LASTMOD: Record<string, Date | undefined> = {
    "": lmHome,
    "/du-doan": lmAnalysis,
    "/blog": lmBlog,
  };

  // 14/11 gọn sitemap (Peter chốt): chỉ trang chủ + 3 mục lục chính + trang tin cậy (giới
  // thiệu, tác giả). RÚT khỏi sitemap nhưng VẪN index (trang thật, chỉ thôi mời): /learn,
  // /daily-board, /archive, /stats, /matches, /analysis, /news, /guides, /ket-qua,
  // /calculators/*, /responsible-play. Trước đó đã rút: /keo, /play/*, /daily-line (301),
  // /track-record + /transparency (noindex).
  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: BASE, changeFrequency: "daily", priority: 1, alternates: alternates("/") },
    { url: `${BASE}/du-doan`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/du-doan") },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8, alternates: alternates("/blog") },
    { url: `${BASE}/competitions`, changeFrequency: "daily", priority: 0.7, alternates: alternates("/competitions") },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8, alternates: alternates("/about") },
    // Hồ sơ tác giả (Peter chốt 15/9) — byline mọi bài trỏ về đây.
    { url: `${BASE}/tac-gia/pete-nguyen`, changeFrequency: "weekly", priority: 0.6, alternates: alternates("/tac-gia/pete-nguyen") },
  ] as MetadataRoute.Sitemap).map((r) => {
    const lm = LASTMOD[r.url.slice(BASE.length)];
    return lm ? { ...r, lastModified: lm } : r;
  });

  // /match/* RÚT hết khỏi sitemap 14/11: trang trận có bài chỉ ~200 chữ (bài thật nằm ở
  // /analysis, /blog) — trang tự noindex,follow (xem match/[slug]/page.tsx).

  // Guide: chỉ guide dài trong guideDuocIndex; guide biến thể từng mức tỷ lệ tự noindex
  // (14/11). 6 guide VI_BLOCKED (Nick chốt 4/8) vẫn loại như cũ.
  const guideRoutes: MetadataRoute.Sitemap = guides
    .filter((g) => !VI_BLOCKED_GUIDE_SLUGS.has(g.slug) && guideDuocIndex(g.slug))
    .map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: safeLastMod(g.updated),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: alternates(`/guides/${g.slug}`),
    }));

  // Trang giải: sitemap phải soi ĐÚNG điều kiện sống của trang giải — xem
  // app/[lang]/competitions/[slug]/page.tsx: notFound() khi status khác "active"
  // VÀ cờ standings_<slug> tắt (5/8). 14/11: chỉ giải lớn + World Cup (GIAI_BXH_SITEMAP);
  // giải khác vẫn sống, vẫn index, chỉ thôi mời. Trang con (lịch, phong độ) noindex từ 10/9.
  const lon = competitions.filter((c) => c.slug && GIAI_BXH_SITEMAP.has(c.slug));
  const visible = await Promise.all(
    lon.map(async (c) => {
      if (c.status === "active") return true;
      // Lỗi Supabase thì coi như tắt: thà thiếu một URL còn hơn hỏng cả sitemap.
      try {
        return await isFeatureEnabled(`standings_${c.slug.replace(/-/g, "_")}`);
      } catch {
        return false;
      }
    }),
  );
  const standingsRoutes: MetadataRoute.Sitemap = lon
    .filter((_, i) => visible[i])
    .map((c) => ({
      url: `${BASE}/competitions/${c.slug}`,
      // Không khai lastmod: bảng điểm đổi theo trận, không có cột ngày sửa thật.
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: alternates(`/competitions/${c.slug}`),
    }));

  return [...staticRoutes, ...hubRoutes, ...guideRoutes, ...standingsRoutes];
}
