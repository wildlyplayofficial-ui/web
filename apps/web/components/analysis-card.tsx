import Link from "next/link";
import { locales } from "@/lib/format";
import { withLang, type Lang } from "@/lib/i18n";
import type { AnalysisArticle } from "@/lib/types";

/* eslint-disable @next/next/no-img-element */

/** Badge colors for Desk article kinds — self-contained (mirrors the analysis feed). */
const KIND_COLORS: Record<string, string> = {
  preview: "border-blue-400/40 text-blue-400",
  recap: "border-emerald-400/40 text-emerald-400",
  roundup: "border-amber-400/40 text-amber-400",
  analysis: "border-amber-400/40 text-amber-400",
  news: "border-indigo-soft/40 text-indigo-soft",
};

function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Strip light Markdown and trim to a two-line-ish excerpt. */
export function analysisExcerpt(body: string | null, maxLen = 140): string {
  if (!body) return "";
  const plain = body.replace(/[#*_`>\[\]()!]/g, "").replace(/\n+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.lastIndexOf(" ", maxLen);
  return plain.slice(0, cut > 0 ? cut : maxLen) + "…";
}

/**
 * Card for a Desk-authored analysis article on the homepage.
 * - "lead": hero thumbnail on top, badge + league + date, big title, 2-line excerpt.
 * - "list": compact row — 120px thumbnail left, badge + league tag + title right.
 */
export function AnalysisCard({
  article,
  lang,
  variant = "lead",
}: {
  article: AnalysisArticle;
  lang: Lang;
  variant?: "lead" | "list";
}) {
  const href = withLang(`/analysis/${article.slug}`, lang);
  const hero = article.hero_image ?? `/api/og/analysis/${article.slug}?locale=${lang}`;
  const kindLabel = article.kind.charAt(0).toUpperCase() + article.kind.slice(1);
  const badgeColor = KIND_COLORS[article.kind] ?? KIND_COLORS.roundup;

  if (variant === "list") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group flex overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-brand/30 hover:bg-card-hover"
      >
        {/* Ô list 120px. Ảnh vuông tối giản (thumb_image, chỉ logo, có lề) thì LẤP ĐẦY
            bằng object-cover — crest ở giữa nên không cắt vào. Không có thì rơi về
            banner với object-contain: banner 1200x630 dồn vào ô hẹp thì nhoè, nhưng
            contain giữ trọn logo WildlyPlay ở mép (cover sẽ cắt ~15% mỗi bên). */}
        <div className="w-[120px] shrink-0 self-stretch bg-card-hover">
          <img
            src={article.thumb_image ?? hero}
            alt=""
            loading="lazy"
            className={`h-full w-full ${article.thumb_image ? "object-cover" : "object-contain"}`}
          />
        </div>
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className={`rounded-full border px-2 py-0.5 font-display font-semibold ${badgeColor}`}>
              {kindLabel}
            </span>
            <span className="truncate text-muted/70">{article.league}</span>
          </div>
          <p className="mt-1.5 font-display text-sm font-bold leading-snug line-clamp-2 transition-colors group-hover:text-brand">
            {article.title}
          </p>
        </div>
      </Link>
    );
  }

  const excerpt = analysisExcerpt(article.body);
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition-colors hover:border-brand/30 hover:bg-card-hover"
    >
      <img src={hero} alt="" width={1200} height={630} loading="lazy" className="w-full" />
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
        <h3 className="mt-3 font-display text-lg font-bold transition-colors group-hover:text-brand">
          {article.title}
        </h3>
        {excerpt && <p className="mt-2 text-sm text-muted line-clamp-2">{excerpt}</p>}
      </div>
    </Link>
  );
}
