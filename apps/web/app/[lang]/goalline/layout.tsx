import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import { getDailyLineDict } from "@/lib/goalline/strings";
import { DailyLineNav } from "./components/daily-line-nav";

// Site chỉ còn tiếng Việt (25/8) — tiêu đề/mô tả lấy bộ chữ VI, không lấy `S` (tiếng Anh).
const VI = getDailyLineDict("vi");

export const metadata: Metadata = {
  title: {
    default: `${VI.BRAND} — ${VI.TAGLINE}`,
    template: `%s | ${VI.BRAND}`,
  },
  description:
    "Daily Line — trò chơi dự đoán Over/Under tổng bàn thắng bóng đá mỗi ngày. Chọn phe, leo bảng xếp hạng. Chỉ để giải trí.",
  openGraph: {
    locale: "vi_VN",
    images: [{ url: `/api/og/daily-line?v=${OG_VERSION}`, width: 1200, height: 630 }],
  },
};

export default function GoalLineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <DailyLineNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
