import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: [
      "https://www.wildlyplay.com/sitemap.xml",
      "https://www.wildlyplay.com/news-sitemap.xml",
    ],
  };
}
