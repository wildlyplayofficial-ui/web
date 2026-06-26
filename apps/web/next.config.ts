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
    ];
  },
};

export default nextConfig;
