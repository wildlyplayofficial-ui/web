import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { Post, PostType } from "@/lib/types";

export const revalidate = 300;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type FilterTab = "all" | "picks" | "analysis" | "news";

const TAB_TYPES: Record<FilterTab, PostType[] | null> = {
  all: null,
  picks: ["preview", "recap"],
  analysis: ["analysis"],
  news: ["news"],
};

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  picks: "Picks & Recaps",
  analysis: "Analysis",
  news: "News",
};

const TYPE_LABELS: Record<PostType, string> = {
  recap: "Recap",
  preview: "Preview",
  news: "News",
  analysis: "Analysis",
};

const TYPE_BADGE_COLORS: Record<PostType, string> = {
  preview: "border-blue-400/40 text-blue-400",
  recap: "border-emerald-400/40 text-emerald-400",
  analysis: "border-amber-400/40 text-amber-400",
  news: "border-indigo-soft/40 text-indigo-soft",
};

const PICK_TYPES: PostType[] = ["preview", "recap"];
const RAIL_COUNT = 5;

function resolveTab(value: string | string[] | undefined): FilterTab {
  if (typeof value === "string" && value in TAB_TYPES) return value as FilterTab;
  return "all";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const lang = resolveLang(params.lang);
  const tab = resolveTab(params.type);
  const dict = getDict(lang);
  const canonical = buildTabHref(tab, lang);
  return {
    title: dict.news.title,
    description: dict.news.subtitle,
    alternates: { canonical },
    openGraph: { title: `${dict.news.title} | WildlyPlay`, description: dict.news.subtitle, images: ["/api/og/home"] },
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

function buildTabHref(tab: FilterTab, lang: Lang): string {
  const base = tab === "all" ? "/news" : `/news?type=${tab}`;
  if (lang === "en") return base;
  return base.includes("?") ? `${base}&lang=${lang}` : `${base}?lang=${lang}`;
}

function PostCard({ post, lang }: { post: Post; lang: Lang }) {
  return (
    <Link
      href={withLang(`/news/${post.slug}`, lang)}
      className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-line-hover hover:bg-card-hover"
    >
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
    </Link>
  );
}

export default async function Newsroom({ searchParams }: Props) {
  const params = await searchParams;
  const lang = resolveLang(params.lang);
  const tab = resolveTab(params.type);
  const dict = getDict(lang);
  const allPosts = await getPosts(lang);

  // Rail: 5 latest pick-related posts
  const railPosts = allPosts.filter((p) => PICK_TYPES.includes(p.type)).slice(0, RAIL_COUNT);
  const railIds = new Set(railPosts.map((p) => p.id));
  const showRail = tab === "all" || tab === "picks";

  // Feed: filtered by tab, dedupe rail posts when rail is shown
  const allowedTypes = TAB_TYPES[tab];
  const feedPosts = allPosts.filter((p) => {
    if (allowedTypes && !allowedTypes.includes(p.type)) return false;
    if (showRail && railIds.has(p.id)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[800px] px-5">
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

      {/* Pinned Rail: Latest Picks & Recaps */}
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
        <div className="flex flex-col gap-4 pb-8">
          {feedPosts.map((post) => (
            <PostCard key={post.id} post={post} lang={lang} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
