import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllGuideSlugs, getSettledPicks, isFeatureEnabled, getAllBlogSlugs } from "@/lib/data";
import { getAllAnalysisArticleSlugs, getAnalysisByTeam } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs, getNewsByTeam } from "@/lib/news";
import { TEAM_HUBS } from "@/lib/teams";
import { giaiBxhDuocIndex, laBlogLichCaMua, laTrangLichCaMua, analysisDuocIndex, analysisVaoSitemap, blogVaoSitemap, doiDuocIndex, guideDuocIndex, tranDuocIndex, GIAI_BXH_SITEMAP, SO_NGAY_TRAN_SITEMAP, NHOM_SITEMAP, type NhomSitemap } from "@/lib/chi-muc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { capNhatDuDoan } from "@/lib/du-doan-cap-nhat";
import { lechNgay } from "@/lib/du-doan-loc";
import { HUB_GIAI } from "@/lib/duong-hub-giai";
import { ngayVN } from "@/lib/du-doan-hang";
import { timTran } from "@/lib/du-doan-tran";
import { duDoanCua } from "@/lib/du-doan-nguon";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { hubCuaGiai } from "@/lib/giai-hub";
import { phanTichRieng } from "@/lib/phan-tich-rieng";
import { fetchCompetitionTable } from "@/lib/standings";
import { tepXgDoi } from "@/lib/xg-doi";
import { TRANG_LICH_2027 } from "@/lib/lich-2027-ds";

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

// 15/11: bỏ force-dynamic — sitemap dựng lại tối đa mỗi giờ (ISR), không dựng mỗi lượt bò.
export const revalidate = 3600;

const BASE = SITE_URL;
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

// 15/11: bỏ hreflang trong sitemap — site chỉ còn tiếng Việt, khai hreflang="vi" trỏ về chính nó là thừa.

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
  // 15/11: bỏ bài đã dời sang trang trận /du-doan/{slug} (/blog/{slug} 301 sang đó) — sitemap chỉ chứa URL cuối.
  const [blogs, { hang }] = await Promise.all([getAllBlogSlugs(), taiDuDoan().catch(() => ({ hang: [] }))]);
  return blogs.filter((b) => blogVaoSitemap(b.slug) && !timTran(hang, b.slug)).map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: safeLastMod(b.updated),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}

// Dọn chỉ mục 9/11 (Peter chốt): chỉ nộp bài được mời index — khớp robots ở trang bài.
// 14/11 gọn sitemap: chỉ nộp nhóm "xem … ở đâu"; bài lịch/mấy giờ/nhận định vẫn index nhưng thôi mời.
async function nhomAnalysis(): Promise<MetadataRoute.Sitemap> {
  // 15/11: bỏ bài có trang trận /du-doan/{slug} (/analysis/nhan-dinh-… chuyển hẳn sang đó).
  const [deskArticles, { hang }] = await Promise.all([getAllAnalysisArticleSlugs(), taiDuDoan().catch(() => ({ hang: [] }))]);
  return deskArticles.filter((a) => analysisDuocIndex(a.slug, a.updated) && analysisVaoSitemap(a.slug) && !timTran(hang, a.slug)).map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: lastmodBaiDuDoan(a.slug, a.modified),
    changeFrequency: "weekly",
    priority: 0.7,
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
  // robots ở trang trận (tranDuocIndex: chỉ 5 giải lớn + C1, trang `tuan-…` phải đủ số liệu — 15/11).
  // 14/11 gọn sitemap (Peter chốt): chỉ trận đá trong SO_NGAY_TRAN_SITEMAP ngày tới (giờ VN,
  // tính cả hôm nay); trận đã qua hoặc còn xa vẫn sống, vẫn theo robots cũ, chỉ thôi mời.
  const { hang } = await taiDuDoan().catch(() => ({ hang: [] }));
  const homNay = ngayVN(Date.now());
  const hanCuoi = lechNgay(homNay, SO_NGAY_TRAN_SITEMAP);
  const lmHub = capNhatDuDoan(hang, Date.now());
  const tranRoutes: MetadataRoute.Sitemap = hang
    .filter((h) => tranDuocIndex(h) && h.ngay >= homNay && h.ngay <= hanCuoi)
    .map((h) => ({
      url: `${BASE}/du-doan/${h.slug}`,
      // 18/11: trận chưa đá trước đây KHÔNG khai lastmod. Giờ dùng mốc 00:00 giờ VN hôm nay (cùng mốc
      // dateModified của hub /du-doan: danh sách trận đổi theo ngày), không dùng lúc dựng trang.
      lastModified: h.sapDa && lmHub ? new Date(lmHub) : safeLastMod(Date.parse(h.kickoffUtc) + 2 * 3_600_000),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  // 16/11 gộp trang giải: /du-doan/{giai} (5 giải lớn + Cúp C1) 301 về hub /competitions/{slug},
  // nên rút khỏi sitemap — hub đã nằm ở nhóm static. Trang khuôn (kèo xiên, tip theo ngày/loại
  // kèo/giải, /du-doan/{ngày}…) rút từ 14/11 và tự noindex,follow như cũ.
  return tranRoutes;
}

async function nhomStatic(): Promise<MetadataRoute.Sitemap> {
  // Bài/tin/blog chỉ lấy NGÀY để tính lastmod trang mục lục — URL của chúng nằm ở nhóm riêng.
  const [guides, blogs, competitions, deskArticles, newsItems, settledPicks] = await Promise.all([getAllGuideSlugs(), getAllBlogSlugs(), getStandingsCompetitions(), getAllAnalysisArticleSlugs(), getAllNewsItemSlugs(), getSettledPicks()]);

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
  const { hang: hangDuDoan } = await taiDuDoan().catch(() => ({ hang: [] }));
  const lmDuDoan = capNhatDuDoan(hangDuDoan, Date.now());
  const LASTMOD: Record<string, Date | undefined> = {
    "": lmHome,
    "/du-doan": lmDuDoan ? new Date(lmDuDoan) : undefined,
    "/blog": lmBlog,
  };

  // 14/11 gọn sitemap (Peter chốt): chỉ trang chủ + 3 mục lục chính + trang tin cậy (giới
  // thiệu, tác giả). RÚT khỏi sitemap nhưng VẪN index (trang thật, chỉ thôi mời): /learn,
  // /daily-board, /archive, /stats, /matches, /analysis, /news, /guides, /ket-qua,
  // /calculators/*, /responsible-play. Trước đó đã rút: /keo, /play/*, /daily-line (301),
  // /track-record + /transparency (noindex).
  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/du-doan`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/competitions`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8 },
    // Hồ sơ tác giả (Peter chốt 15/9) — byline mọi bài trỏ về đây.
    { url: `${BASE}/tac-gia/pete-nguyen`, changeFrequency: "weekly", priority: 0.6 },
  ] as MetadataRoute.Sitemap).map((r) => {
    const lm = LASTMOD[r.url.slice(BASE.length)];
    return lm ? { ...r, lastModified: lm } : r;
  });

  // /thong-so + /form (15/11): trang số liệu theo đội từ data/xg-doi.json — lastmod = ngày máy kéo FotMob.
  const xgDoi = tepXgDoi();
  // 16/11 gộp trang giải: /form/{giai} 301 hết (về hub hoặc /thong-so/{giai}); /thong-so/{giai} của
  // giải có hub /competitions cũng 301. Chỉ còn hai trang mục lục + /thong-so/{giai} của giải chưa có hub.
  const soLieuRoutes: MetadataRoute.Sitemap = ["/thong-so", "/form", ...xgDoi.giai.filter((g) => !HUB_GIAI[g.slug]).map((g) => `/thong-so/${g.slug}`)].map((u) => ({
    url: `${BASE}${u}`,
    lastModified: safeLastMod(xgDoi.capNhat),
    changeFrequency: "daily" as const,
    priority: u.split("/").length === 2 ? 0.8 : 0.7,
  }));

  // Hub /xem-bong-da-o-dau (16/11): gom mọi bài lịch cả mùa / xem ở đâu / đá mấy giờ — lastmod = bài mới sửa nhất trong nhóm.
  const hubXemRoute: MetadataRoute.Sitemap = [{
    url: `${BASE}/xem-bong-da-o-dau`,
    lastModified: moiNhat([
      ...deskArticles.filter((a) => laTrangLichCaMua(a.slug)).map((a) => a.modified),
      ...blogs.filter((b) => laBlogLichCaMua(b.slug)).map((b) => b.updated),
    ]),
    changeFrequency: "weekly",
    priority: 0.8,
  }];

  // Trang lịch thi đấu 2027 (19/11): hub + Asian Cup + C1 + World Cup nữ + SEA Games, index,follow.
  // lastmod = ngày kiểm dữ kiện ghi trong tệp lib của từng trang.
  const lich2027Routes: MetadataRoute.Sitemap = TRANG_LICH_2027.map((t) => ({
    url: `${BASE}${t.duong}`,
    lastModified: safeLastMod(t.capNhatIso),
    changeFrequency: "weekly" as const,
    priority: t.duong === "/lich-thi-dau-bong-da-2027" ? 0.8 : 0.7,
  }));

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
    }));

  // Trang giải: sitemap phải soi ĐÚNG điều kiện sống của trang giải — xem
  // app/[lang]/competitions/[slug]/page.tsx: notFound() khi status khác "active"
  // VÀ cờ standings_<slug> tắt (5/8). 14/11: chỉ giải lớn + World Cup (GIAI_BXH_SITEMAP);
  // giải khác vẫn sống, vẫn index, chỉ thôi mời. Trang con (lịch, phong độ) noindex từ 10/9.
  const lon = competitions.filter((c) => c.slug && GIAI_BXH_SITEMAP.has(c.slug));
  const visible = await Promise.all(
    lon.map(async (c) => {
      // Lỗi Supabase thì coi như tắt: thà thiếu một URL còn hơn hỏng cả sitemap.
      const song = c.status === "active" ||
        (await isFeatureEnabled(`standings_${c.slug.replace(/-/g, "_")}`).catch(() => false));
      if (!song) return false;
      // 16/11: giải không có bảng thật (World Cup 2026 đã xong) → trang noindex, không mời vào sitemap.
      const bang = await fetchCompetitionTable(c.livescoreId)
        .catch((e: unknown) => (e instanceof Error && e.message.endsWith(": rỗng") ? [] : null));
      return bang === null || giaiBxhDuocIndex(c.slug, bang.length);
    }),
  );
  const standingsRoutes: MetadataRoute.Sitemap = lon
    .filter((_, i) => visible[i])
    .map((c) => ({
      url: `${BASE}/competitions/${c.slug}`,
      // lastmod chỉ khai cho hub 5 giải lớn: data/giai-hub.json có giờ máy cập nhật thật (capNhat).
      // Giải khác không có cột ngày sửa thật nên không khai.
      // 19/11: trang có khối phân tích viết tay thì lấy ngày mới hơn giữa số liệu và bài phân tích.
      ...(hubCuaGiai(c.slug) ? { lastModified: ngayMoiHon(hubCuaGiai(c.slug)!.data.capNhat, phanTichRieng(c.slug)?.capNhatIso) } : {}),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...soLieuRoutes, ...hubXemRoute, ...lich2027Routes, ...hubRoutes, ...guideRoutes, ...standingsRoutes];
}

function ngayMoiHon(a: string, b?: string): string {
  return b && Date.parse(b) > Date.parse(a) ? b : a;
}
