import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Serve /daily-line/* from /goalline/* code — with lang prefix support
      { source: "/:lang(en|vi|th|es)/daily-line", destination: "/:lang/goalline" },
      { source: "/:lang(en|vi|th|es)/daily-line/:path*", destination: "/:lang/goalline/:path*" },
    ];
  },
  async redirects() {
    return [
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
      // 301 migrate /news -> /analysis (moved 10/7/2026, IA rebuild)
      { source: "/news", destination: "/analysis", statusCode: 301 },
      { source: "/news/:slug", destination: "/analysis/:slug", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news", destination: "/:lang/analysis", statusCode: 301 },
      { source: "/:lang(en|vi|th|es)/news/:slug", destination: "/:lang/analysis/:slug", statusCode: 301 },
    ];
  },
};

export default nextConfig;
