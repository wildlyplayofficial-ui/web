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
