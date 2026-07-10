import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { Post, PostType } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type FilterTab = "all" | "picks" | "analysis" | "news" | "noplay" | "postmortem";

const TAB_TYPES: Record<FilterTab, PostType[] | null> = {
  all: null,
  picks: ["preview", "recap"],
  analysis: ["analysis"],
  news: ["news"],
  noplay: ["no-play"],
  postmortem: ["post-mortem"],
};

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  picks: "Picks & Recaps",
  analysis: "Analysis",
  news: "News",
  noplay: "No Play",
  postmortem: "Post-Mortem",
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

const PICK_TYPES: PostType[] = ["preview", "recap"];
const RAIL_COUNT = 5;
const PAGE_SIZE = 10;

function resolveTab(value: string | string[] | undefined): FilterTab {
  if (typeof value === "string" && value in TAB_TYPES) return value as FilterTab;
  return "all";
}

function resolvePage(value: string | string[] | undefined): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const tab = resolveTab(sp.type);
  const page = resolvePage(sp.page);
  const dict = getDict(lang);
  const canonical = buildTabHref(tab, lang, page > 1 ? page : undefined);
  return {
    title: dict.news.title,
    description: dict.news.subtitle,
    alternates: { canonical },
    openGraph: { title: `${dict.news.title} | WildlyPlay`, description: dict.news.subtitle, images: [{ url: "/api/og/editorial?title=Newsroom&subtitle=Analysis%2C%20previews%2C%20recaps%2C%20and%20post-mortems", width: 1200, height: 630 }] },
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
  const path = qs ? `/news?${qs}` : "/news";
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
      href={withLang(`/news/${post.slug}`, lang)}
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

export default async function Newsroom({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const tab = resolveTab(sp.type);
  const page = resolvePage(sp.page);
  const dict = getDict(lang);
  const allPosts = await getPosts(lang);

  // Rail: 5 latest pick-related posts
  // Nick 16/6: tab "all" = single chronological feed (no rail split).
  const railPosts = allPosts.filter((p) => PICK_TYPES.includes(p.type)).slice(0, RAIL_COUNT);
  const railIds = new Set(railPosts.map((p) => p.id));
  const showRail = tab === "picks" && page === 1;

  const allowedTypes = TAB_TYPES[tab];
  const allFeedPosts = allPosts.filter((p) => {
    if (allowedTypes && !allowedTypes.includes(p.type)) return false;
    if (showRail && railIds.has(p.id)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(allFeedPosts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const feedPosts = allFeedPosts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"Newsroom",url:"/news"}]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

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
          {feedPosts.length > 0 && (
            <hr className="my-8 border-line" />
          )}
        </section>
      )}

      {/* Feed */}
      {feedPosts.length === 0 && (!showRail || railPosts.length === 0) ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.news.empty}
        </div>
      ) : feedPosts.length > 0 ? (
        <>
          <div className="flex flex-col gap-4 pb-4">
            {feedPosts.map((post) => (
              <PostCard key={post.id} post={post} lang={lang} />
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
    </div>
  );
}
