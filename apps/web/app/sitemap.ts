import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { VI_BLOCKED_GUIDE_SLUGS } from "@/lib/vi-blocked-guides";
import { getAllMatchSlugs, getAllPostSlugs, getAllGuideSlugs, getAllReportSlugs, getSettledPicks, buildPlaySlug, isFeatureEnabled } from "@/lib/data";
import { getAllAnalysisArticleSlugs, getAnalysisByTeam } from "@/lib/analysis-articles";
import { getAllNewsItemSlugs, getNewsByTeam } from "@/lib/news";
import { TEAM_HUBS } from "@/lib/teams";
import { getStandingsCompetitions } from "@/lib/standings-extra";

/** SEO: mọi kèo đã chốt + bài đã đăng, chỉ bản tiếng Việt (site bỏ en/th/es từ 23/8). */

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = SITE_URL;
// Chỉ còn tiếng Việt (Nick + Peter chốt 23/8) — không khai hreflang cho ngôn ngữ
// đã bỏ, nếu không Google vẫn bò /en /th /es rồi ăn 301 vô ích.
const LANGS = ["vi"] as const;

// Ngày reposition VI-legal (28/7/2026) — set lastModified cho trang static/hub để
// Google biết nội dung vừa đổi và re-crawl bản VI mới sớm (trước chỉ có changeFrequency).
const VI_REPOSITION = new Date("2026-07-28");

/** lastModified không bao giờ được ở TƯƠNG LAI: trang trận lấy ngày đá làm mốc sửa,
 *  nên 203/816 URL khai ngày 24/8, 29/8… trong khi hôm nay 23/8 (kiểm 23/8/2026).
 *  Google thấy lastmod không đáng tin thì bỏ qua lastmod của CẢ sitemap, mất luôn
 *  tín hiệu "nội dung vừa cập nhật" cho những trang khai đúng. */
function safeLastMod(value: string | number | Date | null | undefined): Date {
  const d = value ? new Date(value) : new Date();
  const now = new Date();
  return Number.isNaN(d.getTime()) || d > now ? now : d;
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
  const [posts, matches, guides, reports, competitions, deskArticles, newsItems, settledPicks] = await Promise.all([getAllPostSlugs(), getAllMatchSlugs(), getAllGuideSlugs(), getAllReportSlugs(), getStandingsCompetitions().catch(() => []), getAllAnalysisArticleSlugs(), getAllNewsItemSlugs(), getSettledPicks()]);

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

  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: BASE, changeFrequency: "daily", priority: 1, alternates: alternates("/") },
    { url: `${BASE}/daily-board`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/daily-board") },
    // /keo bị bỏ quên khỏi sitemap từ lúc dựng trang (Gwen phát hiện 25/8): trang
    // để index, follow và cập nhật mỗi 3 tiếng, nhưng không có mặt trong 829 URL
    // của sitemap. Ưu tiên 0.9 ngang /daily-board vì cùng là trang trụ.
    { url: `${BASE}/keo`, changeFrequency: "daily", priority: 0.9, alternates: alternates("/keo") },
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
    // /news mở lại 8/8 (bỏ 301) nhưng quên khai sitemap — Google không tự thấy (Jane 9/8)
    { url: `${BASE}/news`, changeFrequency: "hourly", priority: 0.7, alternates: alternates("/news") },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.7, alternates: alternates("/guides") },
    { url: `${BASE}/transparency`, changeFrequency: "monthly", priority: 0.7, alternates: alternates("/transparency") },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.8, alternates: alternates("/about") },
    { url: `${BASE}/responsible-play`, changeFrequency: "monthly", priority: 0.3, alternates: alternates("/responsible-play") },
  ] as MetadataRoute.Sitemap).map((r) => ({ ...r, lastModified: VI_REPOSITION }));

  // /play/ pick pages: every settled play now lives on the prefix-less Vietnamese
  // canonical (self-canonical, no /match override, no /en 301). Declare each so
  // Google indexes the VI-safe pick surface. (Nick 21/8, retires the 16/8 rule)
  const playRoutes: MetadataRoute.Sitemap = settledPicks.map((pick) => {
    const slug = buildPlaySlug(pick);
    return {
      url: `${BASE}/play/${slug}`,
      lastModified: safeLastMod(pick.settled_at ?? pick.kickoff_utc),
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: alternates(`/play/${slug}`),
    };
  });

  const newsRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/analysis/${p.slug}`,
    lastModified: safeLastMod(p.updated),
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: alternates(`/analysis/${p.slug}`),
  }));

  // Trận TƯƠNG LAI xa hơn 14 ngày chưa vào sitemap — 154 trang rỗng tháng 9 đang
  // hút crawl budget (kiểm kê 25/8). Tới gần ngày đá tự vào lại vì sitemap là
  // force-dynamic. Trận sắp đá ≤14 ngày GIỮ (nhu cầu "mấy giờ/xem ở đâu" là thật —
  // Jane 16/8 + trang top impression). Trận đã đá giữ (có tỷ số + match facts).
  const HORIZON_MS = 14 * 24 * 3600 * 1000;
  const cutoff = Date.now() + HORIZON_MS;
  const matchRoutes: MetadataRoute.Sitemap = matches.filter((m) => {
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

  const deskRoutes: MetadataRoute.Sitemap = deskArticles.map((a) => ({
    url: `${BASE}/analysis/${a.slug}`,
    lastModified: safeLastMod(a.updated),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: alternates(`/analysis/${a.slug}`),
  }));

  // /news article pages: only the /news index was declared (line above), never the
  // individual news_items — so every published news item (transfers, previews…) was
  // orphaned from Google despite being live. Declare each one (Jane 15/8).
  const newsItemRoutes: MetadataRoute.Sitemap = newsItems.map((n) => ({
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
  const subPages = (c: { livescoreId: number }) =>
    c.livescoreId !== 362 ? ["", "/fixtures", "/form"] : [""];
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
        lastModified: VI_REPOSITION,
        changeFrequency: "daily" as const,
        priority: sub === "" ? 0.7 : 0.6,
        alternates: alternates(`/competitions/${c.slug}${sub}`),
      })),
    );

  return [...staticRoutes, ...hubRoutes, ...playRoutes, ...newsRoutes, ...newsItemRoutes, ...deskRoutes, ...guideRoutes, ...reportRoutes, ...matchRoutes, ...standingsRoutes];
}
