import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Serve /daily-line/* from /goalline/* code (no directory rename needed)
      { source: "/daily-line", destination: "/goalline" },
      { source: "/daily-line/:path*", destination: "/goalline/:path*" },
    ];
  },
  async redirects() {
    return [
      // 308 permanent redirect old /goalline URLs to /daily-line
      { source: "/goalline", destination: "/daily-line", permanent: true },
      { source: "/goalline/:path*", destination: "/daily-line/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
