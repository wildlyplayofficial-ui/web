import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/ chặn chung, nhưng ẢNH nằm dưới /api/: ảnh bài qua cổng đệm /api/anh/,
    // thẻ og và ảnh dự phòng của thẻ bài qua /api/og/. Chặn luôn thì Google không
    // tải được ảnh trong trang lẫn ảnh xem trước (9/11). Google theo luật DÀI hơn
    // thắng: "Allow: /api/anh/" dài hơn "Disallow: /api/" nên được mở, không phụ
    // thuộc thứ tự dòng.
    rules: { userAgent: "*", allow: ["/", "/api/anh/", "/api/og/"], disallow: "/api/" },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ],
  };
}
