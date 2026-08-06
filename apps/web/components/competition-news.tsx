import Link from "next/link";
import type { AnalysisArticle } from "@/lib/types";
import { withLang, type Lang } from "@/lib/i18n";
import { LocalDate } from "@/components/local-date";
import { locales } from "@/lib/format";

/**
 * Bài viết mới nhất của một giải, đặt ngay dưới H1 trang giải (Peter 6/8): người
 * vào trang giải muốn đọc tin trước, bảng xếp hạng là để tra cứu.
 *
 * Nguồn là `analysis_articles` chứ không phải `news_items` vì /news đang bị 301
 * về /analysis (spec §2E, 12/7) — bài nào nằm ở news_items hiện không ai đọc
 * được. Đổi nguồn khi nào chốt lại chuyện /news.
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
          <Link
            key={article.slug}
            href={withLang(`/analysis/${article.slug}`, lang)}
            className="group rounded-card border border-line bg-card p-5 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
          >
            {article.published_at && (
              <LocalDate
                iso={article.published_at}
                locale={locales[lang]}
                format="short"
                className="text-xs text-muted"
              />
            )}
            <h3 className="mt-2 font-display text-base font-bold leading-snug transition-colors group-hover:text-brand">
              {article.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
