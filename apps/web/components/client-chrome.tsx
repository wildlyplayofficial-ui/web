"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Service worker + Google Analytics, quyết định phía TRÌNH DUYỆT.
 *
 * ⚠️ VÌ SAO KHÔNG ĐỂ Ở BỐ CỤC GỐC NỮA (27/8/2026):
 * Bố cục gốc trước đây đọc tiêu đề `x-pathname` để biết có phải trang quản trị không.
 * Bố cục gốc bọc MỌI đường, nên chạm tiêu đề yêu cầu ở đó là CẢ SITE bị render động —
 * `revalidate = 300` của trang chủ không bao giờ được dùng, mỗi lượt vào là dựng lại
 * từ đầu và bắn 33 lượt gọi ra ngoài. Đo được: mọi trang, kể cả trang 404, đều trả
 * `private, no-cache, no-store` và `X-Vercel-Cache: MISS`.
 * Hỏi đường ở phía trình duyệt thì máy chủ không cần biết đường nào, nên trang đệm lại được.
 */
export function ClientChrome() {
  const pathname = usePathname();
  const laQuanTri = pathname.startsWith("/admin");

  useEffect(() => {
    if (laQuanTri) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Đăng ký hỏng thì thôi, không có gì để người đọc phải thấy.
    });
  }, [laQuanTri]);

  if (laQuanTri) return null;
  return <GoogleAnalytics gaId="G-HM4G87BT3Q" />;
}
