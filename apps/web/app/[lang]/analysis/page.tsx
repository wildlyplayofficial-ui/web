import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import { locales } from "@/lib/format";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { canonicalTrang } from "@/lib/canonical-trang";
import type { AnalysisArticle } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Badge colors for Desk article kinds. */
const DESK_KIND_COLORS: Record<string, string> = {
  preview: "border-blue-400/40 text-blue-400",
  recap: "border-emerald-400/40 text-emerald-400",
  roundup: "border-amber-400/40 text-amber-400",
  analysis: "border-amber-400/40 text-amber-400",
  news: "border-indigo-soft/40 text-indigo-soft",
};

// 50 thay vì 10: 272 bài từ 28 trang xuống 6 trang, Google bò tới cuối nhanh hơn.
const PAGE_SIZE = 50;

function resolvePage(value: string | string[] | undefined): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.analysis.title,
    description: dict.analysis.seoDescription,
    ...canonicalTrang("/analysis", lang, await searchParams),
    openGraph: {
      title: `${dict.analysis.title} | banhbong.net`,
      description: dict.analysis.seoDescription,
      images: [{ url: `/api/og/editorial?title=Analysis&subtitle=Previews%2C%20recaps%2C%20and%20post-mortems&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.analysis.title} | banhbong.net`,
      description: dict.analysis.seoDescription,
    },
  };
}

function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Chỉ còn tham số `page`: bộ lọc `?type=` bỏ cùng lúc với bộ tab (2/9/2026). */
function buildPageHref(lang: Lang, page?: number): string {
  const path = page && page > 1 ? `/analysis?page=${page}` : "/analysis";
  return withLang(path, lang);
}

function extractExcerpt(body: string | null, maxLen = 140): string {
  if (!body) return "";
  const plain = body.replace(/[#*_`>\[\]()!]/g, "").replace(/\n+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.lastIndexOf(" ", maxLen);
  return plain.slice(0, cut > 0 ? cut : maxLen) + "\u2026";
}

/** Card for a Desk-authored analysis article (spec §2B). */
function DeskCard({ article, lang }: { article: AnalysisArticle; lang: Lang }) {
  const excerpt = extractExcerpt(article.body);
  const kindLabel = article.kind.charAt(0).toUpperCase() + article.kind.slice(1);
  const badgeColor = DESK_KIND_COLORS[article.kind] ?? DESK_KIND_COLORS.roundup;

  return (
    <Link
      href={withLang(`/analysis/${article.slug}`, lang)}
      className="group rounded-card border border-line bg-card shadow-card transition-colors hover:border-line-hover hover:bg-card-hover overflow-hidden"
    >
      <img
        src={article.hero_image ?? `/api/og/analysis/${article.slug}?locale=${lang}&v=${OG_VERSION}`}
        alt=""
        width={1200}
        height={630}
        className="w-full"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className={`rounded-full border px-2 py-0.5 font-display font-semibold ${badgeColor}`}>
            {kindLabel}
          </span>
          <span className="text-muted/70">{article.league}</span>
          <time dateTime={article.published_at} className="ml-auto shrink-0">
            {formatDate(article.published_at, lang)}
          </time>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold transition-colors group-hover:text-brand">
          {article.title}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {article.byline}
        </p>
        {excerpt && (
          <p className="mt-2 text-sm text-muted line-clamp-2">{excerpt}</p>
        )}
      </div>
    </Link>
  );
}

export default async function AnalysisFeed({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const page = resolvePage(sp.page);
  const dict = getDict(lang);

  // 2/9/2026: mục lục này CHỈ còn bài Desk. ~931 bài máy đẻ thời WildlyPlay nằm
  // trong bảng `posts` (tiếng Anh) đã bị noindex + gỡ khỏi sitemap ở PR #238,
  // nhưng người đọc vẫn thấy chúng ở đây — nên thôi lấy `posts` ra hẳn. Bộ tab
  // đi theo luôn vì 5/7 tab chỉ trỏ vào loại bài máy đẻ, lọc xong là rỗng.
  // Bài cũ KHÔNG xoá khỏi kho, địa chỉ cũ vẫn mở được.
  const articles = await getAnalysisArticles(undefined, 100);

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageFeed = articles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.analysis.title, url: "/analysis" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.analysis.title}</h1>
        <p className="mt-3 text-muted">{dict.analysis.subtitle}</p>
      </section>

      {/* Standing disclaimer (spec §2B) */}
      <p className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted">
        {dict.analysis.disclaimer}
      </p>

      {/* Feed */}
      {pageFeed.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.analysis.empty}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 pb-4">
            {pageFeed.map((article) => (
              <DeskCard key={article.id} article={article} lang={lang} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-2 pb-8 pt-4">
              {safePage > 1 && (
                <Link
                  href={buildPageHref(lang, safePage - 1)}
                  className="rounded-card border border-line bg-card px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hover hover:text-foreground"
                >
                  &larr; Prev
                </Link>
              )}
              {/* Số trang: mỗi trang cách trang đầu ĐÚNG 1 cú bấm. Trước đây chỉ có
                  Prev/Next nên muốn tới trang cuối phải bấm Next liên tiếp — Google
                  không làm vậy nên bài nằm sâu không bao giờ được thu thập. */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageHref(lang, p)}
                  aria-current={p === safePage ? "page" : undefined}
                  className={
                    p === safePage
                      ? "rounded-card border border-brand bg-brand/10 px-3.5 py-2 text-sm font-semibold text-brand"
                      : "rounded-card border border-line bg-card px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hover hover:text-foreground"
                  }
                >
                  {p}
                </Link>
              ))}
              {safePage < totalPages && (
                <Link
                  href={buildPageHref(lang, safePage + 1)}
                  className="rounded-card border border-line bg-card px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hover hover:text-foreground"
                >
                  Next &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <p className="pb-10 pt-2 text-center text-sm text-muted">
        Want to crunch the numbers yourself?{" "}
        <Link href={withLang("/calculators", lang)} className="font-semibold text-brand hover:underline">
          Try our free calculators &rarr;
        </Link>
      </p>
    </div>
  );
}
