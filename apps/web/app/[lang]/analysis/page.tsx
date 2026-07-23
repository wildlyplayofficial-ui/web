import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/data";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { AnalysisArticle, Post, PostType } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type FilterTab = "all" | "picks" | "analysis" | "news" | "noplay" | "postmortem" | "desk";

const TAB_TYPES: Record<FilterTab, PostType[] | null> = {
  all: null,
  picks: ["preview", "recap"],
  analysis: ["analysis"],
  news: ["news"],
  noplay: ["no-play"],
  postmortem: ["post-mortem"],
  desk: [], // special: Desk articles only
};

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  picks: "Picks & Recaps",
  analysis: "Analysis",
  news: "News",
  noplay: "No Play",
  postmortem: "Post-Mortem",
  desk: "Desk",
};

const TYPE_LABELS: Record<PostType, string> = {
  recap: "Recap",
  preview: "Preview",
  news: "News",
  analysis: "Analysis",
  "no-play": "No Play",
  "post-mortem": "Post-Mortem",
  guide: "Guide",
};

const TYPE_BADGE_COLORS: Record<PostType, string> = {
  preview: "border-blue-400/40 text-blue-400",
  recap: "border-emerald-400/40 text-emerald-400",
  analysis: "border-amber-400/40 text-amber-400",
  news: "border-indigo-soft/40 text-indigo-soft",
  "no-play": "border-muted/40 text-muted",
  "post-mortem": "border-loss/40 text-loss",
  guide: "border-brand/40 text-brand",
};

/** Badge colors for Desk article kinds. */
const DESK_KIND_COLORS: Record<string, string> = {
  preview: "border-blue-400/40 text-blue-400",
  recap: "border-emerald-400/40 text-emerald-400",
  roundup: "border-amber-400/40 text-amber-400",
};

/** Badge labels for Desk article tiers. */
const TIER_LABELS: Record<string, string> = {
  T1_covered: "Covered",
  T2_marquee: "Marquee",
};

const PICK_TYPES: PostType[] = ["preview", "recap"];
const RAIL_COUNT = 5;
const PAGE_SIZE = 10;

/** Unified feed item — either a Post or a Desk AnalysisArticle. */
type FeedItem =
  | { source: "post"; post: Post }
  | { source: "desk"; article: AnalysisArticle };

function feedItemDate(item: FeedItem): string {
  if (item.source === "post") return item.post.published_at ?? "";
  return item.article.published_at;
}

function resolveTab(value: string | string[] | undefined): FilterTab {
  if (typeof value === "string" && value in TAB_TYPES) return value as FilterTab;
  return "all";
}

function resolvePage(value: string | string[] | undefined): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.analysis.title,
    description: dict.analysis.seoDescription,
    alternates: buildAlternates("/analysis", lang),
    openGraph: {
      title: `${dict.analysis.title} | WildlyPlay`,
      description: dict.analysis.seoDescription,
      images: [{ url: "/api/og/editorial?title=Analysis&subtitle=Previews%2C%20recaps%2C%20and%20post-mortems", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.analysis.title} | WildlyPlay`,
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

function buildTabHref(tab: FilterTab, lang: Lang, page?: number): string {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("type", tab);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  const path = qs ? `/analysis?${qs}` : "/analysis";
  return withLang(path, lang);
}

function extractExcerpt(body: string | null, maxLen = 140): string {
  if (!body) return "";
  const plain = body.replace(/[#*_`>\[\]()!]/g, "").replace(/\n+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.lastIndexOf(" ", maxLen);
  return plain.slice(0, cut > 0 ? cut : maxLen) + "\u2026";
}

function PostCard({ post, lang }: { post: Post; lang: Lang }) {
  const excerpt = post.meta_description || extractExcerpt(post.body_md);
  return (
    <Link
      href={withLang(`/analysis/${post.slug}`, lang)}
      className="group rounded-card border border-line bg-card shadow-card transition-colors hover:border-line-hover hover:bg-card-hover overflow-hidden"
    >
      <img
        src={`/api/og/news/${post.slug}`}
        alt=""
        width={1200}
        height={630}
        className="w-full"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className={`rounded-full border px-2 py-0.5 font-display font-semibold ${TYPE_BADGE_COLORS[post.type]}`}>
            {TYPE_LABELS[post.type]}
          </span>
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at, lang)}
          </time>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold transition-colors group-hover:text-brand">
          {post.title}
        </h2>
        {excerpt && (
          <p className="mt-2 text-sm text-muted line-clamp-2">{excerpt}</p>
        )}
      </div>
    </Link>
  );
}

/** Card for a Desk-authored analysis article (spec §2B). */
function DeskCard({ article, lang }: { article: AnalysisArticle; lang: Lang }) {
  const excerpt = extractExcerpt(article.body);
  const kindLabel = article.kind.charAt(0).toUpperCase() + article.kind.slice(1);
  const badgeColor = DESK_KIND_COLORS[article.kind] ?? DESK_KIND_COLORS.roundup;
  const tierLabel = TIER_LABELS[article.tier];

  return (
    <Link
      href={withLang(`/analysis/${article.slug}`, lang)}
      className="group rounded-card border border-line bg-card shadow-card transition-colors hover:border-line-hover hover:bg-card-hover overflow-hidden"
    >
      <img
        src={article.hero_image ?? `/api/og/analysis/${article.slug}?locale=${lang}`}
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
          {tierLabel && (
            <span className="rounded-full border border-brand/30 px-2 py-0.5 font-display font-semibold text-brand">
              {tierLabel}
            </span>
          )}
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

/** Unified feed card that dispatches to PostCard or DeskCard. */
function FeedCard({ item, lang }: { item: FeedItem; lang: Lang }) {
  if (item.source === "post") return <PostCard post={item.post} lang={lang} />;
  return <DeskCard article={item.article} lang={lang} />;
}

export default async function AnalysisFeed({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const tab = resolveTab(sp.type);
  const page = resolvePage(sp.page);
  const dict = getDict(lang);

  const [allPosts, deskArticles] = await Promise.all([
    getPosts(lang),
    getAnalysisArticles(undefined, 100),
  ]);

  // Rail: 5 latest pick-related posts
  const railPosts = allPosts.filter((p) => PICK_TYPES.includes(p.type)).slice(0, RAIL_COUNT);
  const railIds = new Set(railPosts.map((p) => p.id));
  const showRail = tab === "picks" && page === 1;

  // Build unified feed based on active tab
  let feedItems: FeedItem[];

  if (tab === "desk") {
    // Desk tab: only Desk articles
    feedItems = deskArticles.map((a) => ({ source: "desk" as const, article: a }));
  } else {
    const allowedTypes = TAB_TYPES[tab];
    const postItems: FeedItem[] = allPosts
      .filter((p) => {
        if (allowedTypes && !allowedTypes.includes(p.type)) return false;
        if (showRail && railIds.has(p.id)) return false;
        return true;
      })
      .map((p) => ({ source: "post" as const, post: p }));

    if (tab === "all") {
      // Merge Desk articles into the "all" feed, sorted by date
      const deskItems: FeedItem[] = deskArticles.map((a) => ({
        source: "desk" as const,
        article: a,
      }));
      feedItems = [...postItems, ...deskItems].sort(
        (a, b) => feedItemDate(b).localeCompare(feedItemDate(a)),
      );
    } else {
      feedItems = postItems;
    }
  }

  const totalPages = Math.max(1, Math.ceil(feedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageFeed = feedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.analysis.title, url: "/analysis" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.analysis.title}</h1>
        <p className="mt-3 text-muted">{dict.analysis.subtitle}</p>
      </section>

      {/* Standing disclaimer (spec §2B) */}
      <p className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted">
        Analysis is coverage &amp; analysis, NOT betting advice.
      </p>

      {/* Filter Chips */}
      <nav className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as FilterTab[]).map((t) => (
          <Link
            key={t}
            href={buildTabHref(t, lang)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              t === tab
                ? "bg-brand text-white"
                : "border border-line bg-card text-muted hover:border-line-hover hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>

      {/* Pinned Rail */}
      {showRail && railPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 font-display text-lg font-bold text-brand">Latest Picks & Recaps</h2>
          <div className="flex flex-col gap-3">
            {railPosts.map((post) => (
              <PostCard key={post.id} post={post} lang={lang} />
            ))}
          </div>
          {pageFeed.length > 0 && (
            <hr className="my-8 border-line" />
          )}
        </section>
      )}

      {/* Feed */}
      {pageFeed.length === 0 && (!showRail || railPosts.length === 0) ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.analysis.empty}
        </div>
      ) : pageFeed.length > 0 ? (
        <>
          <div className="flex flex-col gap-4 pb-4">
            {pageFeed.map((item, i) => (
              <FeedCard key={item.source === "post" ? item.post.id : item.article.id} item={item} lang={lang} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3 pb-8 pt-4">
              {safePage > 1 && (
                <Link
                  href={buildTabHref(tab, lang, safePage - 1)}
                  className="rounded-card border border-line bg-card px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hover hover:text-foreground"
                >
                  &larr; Prev
                </Link>
              )}
              <span className="text-sm text-muted">
                Page {safePage} of {totalPages}
              </span>
              {safePage < totalPages && (
                <Link
                  href={buildTabHref(tab, lang, safePage + 1)}
                  className="rounded-card border border-line bg-card px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hover hover:text-foreground"
                >
                  Next &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      ) : null}

      <p className="pb-10 pt-2 text-center text-sm text-muted">
        Want to crunch the numbers yourself?{" "}
        <Link href={withLang("/calculators", lang)} className="font-semibold text-brand hover:underline">
          Try our free calculators &rarr;
        </Link>
      </p>
    </div>
  );
}
