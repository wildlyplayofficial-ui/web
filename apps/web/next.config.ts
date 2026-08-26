import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Serve /daily-line/* from /goalline/* code. Chỉ còn 'vi': proxy viết lại
      // đường không tiền tố thành /vi/... trước khi tới đây, còn /en /th /es đã 301
      // mất ở luật redirect bên dưới. Bỏ en|th|es khỏi đây để nếu luật 301 kia có
      // hỏng thì cũng không còn đường nào render ra được trang ngoại ngữ.
      { source: "/:lang(vi)/daily-line", destination: "/:lang/goalline" },
      { source: "/:lang(vi)/daily-line/:path*", destination: "/:lang/goalline/:path*" },
    ];
  },
  async redirects() {
    return [
      // Bỏ hẳn ba bản ngoại ngữ (Nick + Peter chốt 23/8) — site chỉ còn tiếng Việt.
      // 301 để gom hết tín hiệu về bản VI thay vì để 3.264 URL bốn thứ tiếng chia
      // nhau ngân sách bò của một domain mới. Phải đặt TRƯỚC các luật khác có
      // tiền tố :lang, nếu không luật kia bắt trước và bỏ sót.
      { source: "/:lang(en|th|es)", destination: "/", statusCode: 301 },
      { source: "/:lang(en|th|es)/:path*", destination: "/:path*", statusCode: 301 },
      // 308 permanent redirect old /goalline URLs to /daily-line
      { source: "/goalline", destination: "/daily-line", permanent: true },
      { source: "/goalline/:path*", destination: "/daily-line/:path*", permanent: true },
      { source: "/:lang(en|vi|th|es)/goalline", destination: "/:lang/daily-line", permanent: true },
      { source: "/:lang(en|vi|th|es)/goalline/:path*", destination: "/:lang/daily-line/:path*", permanent: true },
      // 301 redirect evergreen guides from /news/ to /guides/ (moved 28/6/2026)
      { source: "/news/what-is-asian-handicap", destination: "/guides/what-is-asian-handicap", permanent: true },
      { source: "/news/what-is-devigging", destination: "/guides/what-is-devigging", permanent: true },
      { source: "/news/no-play-discipline", destination: "/guides/no-play-discipline", permanent: true },
      { source: "/news/what-makes-a-good-tipster", destination: "/guides/what-makes-a-good-tipster", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/what-is-asian-handicap", destination: "/:lang/guides/what-is-asian-handicap", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/what-is-devigging", destination: "/:lang/guides/what-is-devigging", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/no-play-discipline", destination: "/:lang/guides/no-play-discipline", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/what-makes-a-good-tipster", destination: "/:lang/guides/what-makes-a-good-tipster", permanent: true },
      // 301 redirect old /guides/transparency-report-* to /transparency/*
      { source: "/guides/transparency-report-:slug", destination: "/transparency/:slug", permanent: true },
      { source: "/:lang(en|vi|th|es)/guides/transparency-report-:slug", destination: "/:lang/transparency/:slug", permanent: true },
      // 301 migrate /standings -> /competitions (moved 9/7/2026, IA rebuild)
      { source: "/standings", destination: "/competitions", statusCode: 301 },
      { source: "/standings/:path*", destination: "/competitions/:path*", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/standings", destination: "/:lang/competitions", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/standings/:path*", destination: "/:lang/competitions/:path*", statusCode: 301 },
      // 301 redirect old articles from /news/ to /analysis/ (moved 10/7/2026, IA rebuild).
      // Only redirect prefixes that belong EXCLUSIVELY to old posts (posts table).
      // DO NOT redirect preview-*/result-*/standings-* — those are live news_items.
      { source: "/news/news-:slug", destination: "/analysis/news-:slug", statusCode: 301 },
      { source: "/news/no-play-:slug", destination: "/analysis/no-play-:slug", statusCode: 301 },
      { source: "/news/recap-:slug", destination: "/analysis/recap-:slug", statusCode: 301 },
      { source: "/news/analysis-:slug", destination: "/analysis/analysis-:slug", statusCode: 301 },
      { source: "/news/post-mortem-:slug", destination: "/analysis/post-mortem-:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/news-:slug", destination: "/:lang/analysis/news-:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/no-play-:slug", destination: "/:lang/analysis/no-play-:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/recap-:slug", destination: "/:lang/analysis/recap-:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/analysis-:slug", destination: "/:lang/analysis/analysis-:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/post-mortem-:slug", destination: "/:lang/analysis/post-mortem-:slug", statusCode: 301 },
      // Guide slugs (specific, no prefix pattern)
      { source: "/news/how-de-vigging-works", destination: "/guides/what-is-devigging", permanent: true },
      { source: "/news/kelly-criterion-betting", destination: "/guides/kelly-criterion-betting", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/how-de-vigging-works", destination: "/:lang/guides/what-is-devigging", permanent: true },
      { source: "/:lang(en|vi|th|es)/news/kelly-criterion-betting", destination: "/:lang/guides/kelly-criterion-betting", permanent: true },
      // /giai/* là URL giải thời WildlyPlay, chưa từng được 301 sang IA mới.
      // Hậu quả đo được 23/8: `site:banhbong.net` chỉ trả về ĐÚNG MỘT URL và URL đó
      // là /giai/europa-league — đang 404. Thứ duy nhất Google biết về site là một
      // trang hỏng. Europa League không có trang riêng nên trỏ về danh sách giải;
      // các slug còn lại map 1-1 sang /competitions/.
      { source: "/giai/europa-league", destination: "/competitions", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/giai/europa-league", destination: "/:lang/competitions", statusCode: 301 },
      { source: "/giai", destination: "/competitions", statusCode: 301 },
      { source: "/giai/:path*", destination: "/competitions/:path*", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/giai", destination: "/:lang/competitions", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/giai/:path*", destination: "/:lang/competitions/:path*", statusCode: 301 },
      // RSS feed redirect — must come before the catch-all /news/:slug* below
      { source: "/news/rss.xml", destination: "/api/analysis/rss", statusCode: 301 },
      // /news mở lại thành mục riêng (Peter 8/8) — bỏ 4 dòng 301 catch-all cũ.
      // Redirect slug bài cũ + guides + rss ở trên vẫn giữ để không gãy link.
    ];
  },
};

export default nextConfig;
