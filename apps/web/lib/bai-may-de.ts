import { getSupabase } from "@/lib/supabase";

/**
 * Bài MÁY ĐẺ thời WildlyPlay trong bảng `posts` — noindex + không nộp sitemap.
 *
 * Đám này do worker WildlyPlay sinh tự động cho World Cup 2026: tiếng Anh/đa ngữ,
 * slug dạng `news-…`, `analysis-…`, `no-play-…`, và MỒ CÔI (đo 2/9/2026: 272/418
 * URL bài trong sitemap prod không có một link nội bộ nào trỏ tới). Site giờ chỉ
 * còn tiếng Việt; nội dung thật nằm ở bảng khác — `news_items` (/news) và
 * `analysis_articles` (/analysis, tức Desk) — nên số này chỉ làm loãng chất lượng
 * và ăn crawl budget.
 *
 * Chỉ `guide` (nhà riêng /guides + /transparency) và `blog` là nội dung thật tiếng
 * Việt → GIỮ index như cũ, không có mặt trong danh sách này.
 *
 * Trang bài và sitemap PHẢI dùng chung hằng số này: tách làm hai danh sách rời thì
 * sửa một chỗ quên chỗ kia, hoặc bài rác lọt lại vào Google, hoặc sitemap khai URL
 * noindex → lỗi "Submitted URL marked noindex" trong Search Console.
 */
export const LOAI_BAI_MAY_DE: ReadonlySet<string> = new Set([
  "news",
  "analysis",
  "preview",
  "recap",
  "no-play",
  "post-mortem",
]);

/**
 * Tiền tố slug của bài máy đẻ — worker luôn ghép `<type>-…` (apps/worker/src:
 * preview.ts, recap.ts, news.ts, watching-news.ts, noplay-article.ts,
 * postmortem-article.ts). Proxy dùng regex này làm cổng rẻ để chỉ tra DB với đúng
 * đám slug đó; bài Desk/blog slug tiếng Việt không bao giờ tốn thêm truy vấn.
 */
const SLUG_BAI_MAY_DE_RE = /^(news|analysis|preview|recap|no-play|post-mortem)-[a-z0-9-]+$/;

/**
 * Có phải bài máy đẻ để trả 410 Gone không (14/11/2026: 200 + noindex vẫn để Google
 * bò lại hoài, 410 thì Google bỏ nhanh hơn). Tra y như resolveArticle ở
 * app/[lang]/analysis/[slug]/page.tsx: bài Desk (`analysis_articles`) trùng slug thì
 * Desk thắng → KHÔNG 410; bài `posts` ưu tiên bản vi rồi tới en, loại author scout.
 * Lỗi/hết giờ/thiếu env → trả false, trang render như cũ (200 + noindex).
 */
export async function laBaiMayDe(slug: string): Promise<boolean> {
  if (!SLUG_BAI_MAY_DE_RE.test(slug)) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const [desk, posts] = await Promise.all([
      supabase
        .from("analysis_articles")
        .select("slug")
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1)
        .abortSignal(AbortSignal.timeout(2000)),
      supabase
        .from("posts")
        .select("type, lang")
        .eq("slug", slug)
        .eq("status", "published")
        .neq("author", "scout")
        .in("lang", ["vi", "en"])
        .abortSignal(AbortSignal.timeout(2000)),
    ]);
    if (desk.error || posts.error || (desk.data ?? []).length > 0) return false;
    const rows = (posts.data ?? []) as { type: string; lang: string }[];
    const bai = rows.find((r) => r.lang === "vi") ?? rows.find((r) => r.lang === "en");
    return bai ? LOAI_BAI_MAY_DE.has(bai.type) : false;
  } catch {
    return false;
  }
}
