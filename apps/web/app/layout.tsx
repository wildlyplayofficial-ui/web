import type { Metadata } from "next";
import { ClientChrome } from "@/components/client-chrome";
import { Inter, Space_Grotesk, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, DEFAULT_TITLE } from "@/lib/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "vietnamese"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Free daily football picks by a human curator — every play public forever, wins and losses. Track record, analysis, odds tools and guides across Premier League, La Liga, Serie A and more.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    title: DEFAULT_TITLE,
    description:
      "Free daily football picks by a human curator — every play public forever, wins and losses. Track record, analysis and odds tools.",
    images: [{ url: "/og-home.png", width: 1200, height: 630, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    images: [{ url: "/og-home.png", width: 1200, height: 630 }],
  },
  // Không có max-image-preview:large thì Google Discover gần như không lấy bài —
  // Discover đang là nguồn traffic lớn nhất của báo mạng. Site trước đây không phát
  // thẻ robots nào cả (kiểm 23/8), nên đây là một dòng mở lại cả một cửa.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ⛔ TUYỆT ĐỐI KHÔNG đọc headers()/cookies() trong tệp này (Jane 27/8/2026).
  // Bố cục gốc bọc MỌI đường. Chạm tiêu đề yêu cầu ở đây là CẢ SITE render động:
  // đo được hôm 27/8 là mọi trang, kể cả trang 404, đều trả `private, no-cache,
  // no-store` và `X-Vercel-Cache: MISS`, nên `revalidate = 300` của trang chủ
  // không bao giờ được dùng và trang chủ mất 15-19 giây MỖI lượt vào.
  // Cần biết đường hiện tại thì hỏi ở phía trình duyệt — xem components/client-chrome.tsx.
  // `lang` ghi cứng 'vi': PUBLIC_LANGS chỉ còn 'vi', và HtmlLang đã sửa lại phía
  // trình duyệt khi chuyển trang.

  // Static inline scripts — hardcoded strings only, no user input (safe from XSS)
  const themeScript = '(function(){try{var t=localStorage.getItem("wp_theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark");if(!t)localStorage.setItem("wp_theme","dark")}}catch(e){}})()';

  return (
    <html lang="vi" className={`${inter.variable} ${spaceGrotesk.variable} ${notoSansThai.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#00e676" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* ⛔ KHÔNG in JSON-LD Organization/WebSite ở đây (Jane 27/8/2026).
            app/[lang]/layout.tsx ĐÃ in đúng hai khối đó qua buildOrganization và
            buildWebSite. Để cả hai chỗ là mọi trang công khai phát TRÙNG hai lần —
            lỗi đang có sẵn từ trước, không phải do đợt sửa lưu đệm này.
            Bỏ ở đây còn được thêm: trang quản trị thôi tự mô tả mình là trang tin. */}
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ClientChrome />
      </body>
    </html>
  );
}
