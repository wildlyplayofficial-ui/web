import { AnalysisCard } from "@/components/analysis-card";
import type { Lang } from "@/lib/i18n";
import type { AnalysisArticle } from "@/lib/types";

/**
 * Bài viết mới nhất của một giải, đặt ngay dưới H1 trang giải (Peter 6/8): người
 * vào trang giải muốn đọc tin trước, bảng xếp hạng là để tra cứu.
 *
 * Nguồn là `analysis_articles` chứ không phải `news_items` vì /news đang bị 301
 * về /analysis (spec §2E, 12/7) — bài nào nằm ở news_items hiện không ai đọc
 * được. Đổi nguồn khi nào chốt lại chuyện /news.
 *
 * Dùng lại `AnalysisCard variant="lead"` thay cho thẻ tự chế trước đây: thẻ cũ chỉ
 * in ngày + tiêu đề nên trang giải không có ảnh nào (Peter báo), còn AnalysisCard
 * có sẵn ảnh dự phòng `/api/og/analysis/...` cho bài chưa up ảnh.
 *
 * Không có bài thì KHÔNG render gì: trang giải vẫn phải dùng được trước mùa.
 */
export function CompetitionNews({
  articles,
  lang,
  title,
}: {
  articles: AnalysisArticle[];
  lang: Lang;
  title: string;
}) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <AnalysisCard key={article.slug} article={article} lang={lang} variant="lead" />
        ))}
      </div>
    </section>
  );
}
