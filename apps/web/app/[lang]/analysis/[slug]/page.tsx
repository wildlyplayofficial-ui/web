import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost, getPostLangs, getMatchBySlug } from "@/lib/data";
import { getAnalysisArticleBySlug } from "@/lib/analysis-articles";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { AnalysisArticle } from "@/lib/types";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Try Desk article first, then fall back to posts table. */
async function resolveArticle(slug: string, lang: Lang) {
  const deskArticle = await getAnalysisArticleBySlug(slug);
  if (deskArticle) return { kind: "desk" as const, desk: deskArticle };
  const post = await getPost(slug, lang);
  if (post) return { kind: "post" as const, post };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const resolved = await resolveArticle(slug, lang);
  if (!resolved) return { title: "Not found" };

  if (resolved.kind === "desk") {
    const { desk } = resolved;
    const description = desk.body
      .replace(/[#*_>`\[\]()!]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 160);
    const canonical = `${BASE}${withLang(`/analysis/${slug}`, lang)}`;
    const alternates = buildAlternates(`/analysis/${slug}`, lang);
    return {
      title: desk.title,
      description,
      alternates: { canonical, languages: alternates.languages },
      openGraph: {
        title: desk.title,
        description,
        type: "article",
        publishedTime: desk.published_at,
        images: desk.hero_image
          ? [{ url: desk.hero_image, width: 1200, height: 630 }]
          : [{ url: `/api/og/editorial?title=${encodeURIComponent(desk.title)}`, width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", title: desk.title, description },
    };
  }

  const { post } = resolved;
  const title = post.meta_title ?? post.title;
  const description = post.meta_description
    ?? post.body_md.replace(/[#*_>\-`]/g, "").trim().slice(0, 160);
  const canonical = `${BASE}${withLang(`/analysis/${slug}`, lang)}`;

  const availableLangs = await getPostLangs(slug);
  const languages: Record<string, string> = {};
  for (const l of availableLangs) {
    languages[l] = `${BASE}${withLang(`/analysis/${slug}`, l)}`;
  }
  if (availableLangs.includes("en")) {
    languages["x-default"] = `${BASE}/analysis/${slug}`;
  }

  return {
    title,
    description,
    ...(post.type === "preview" ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: [{ url: `/api/og/news/${slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: `/api/og/news/${slug}`, width: 1200, height: 630 }],
    },
  };
}

/** Byline for a post: neutral "WildlyPlay" for general news coverage (no position),
 *  persona-specific for pick-driven content. */
function postByline(post: { type: string; author?: string }): string {
  if (post.type === "news" || post.type === "guide") return "WildlyPlay";
  if (post.author === "scout") return "The Scout @ WildlyPlay";
  return "The Curator @ WildlyPlay";
}

function buildArticleSchema(
  title: string,
  description: string | undefined,
  publishedAt: string | null,
  authorName: string,
  slug: string,
  lang: Lang,
  imageUrl?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    datePublished: publishedAt ?? undefined,
    dateModified: publishedAt ?? undefined,
    mainEntityOfPage: `${BASE}${withLang(`/analysis/${slug}`, lang)}`,
    image: imageUrl ?? `${BASE}/api/og/news/${slug}`,
    author: {
      "@type": "Organization",
      name: authorName,
      url: BASE,
    },
    publisher: {
      "@type": "Organization",
      name: "WildlyPlay",
      url: BASE,
      logo: { "@type": "ImageObject", url: `${BASE}/icons/icon-512x512.png` },
    },
  };
}

/** Safely embed JSON-LD — escapes < to prevent script injection. */
function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** Render a Desk-authored article (spec sections 2B-C). */
function DeskArticleView({
  article,
  lang,
  dict,
}: {
  article: AnalysisArticle;
  lang: Lang;
  dict: ReturnType<typeof getDict>;
}) {
  const published = new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(article.published_at));

  const schemaData = buildArticleSchema(
    article.title,
    article.body.replace(/[#*_>`\[\]()!]/g, "").replace(/\n+/g, " ").trim().slice(0, 160),
    article.published_at,
    "WildlyPlay Desk",
    article.slug,
    lang,
    article.hero_image ?? undefined,
  );

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <JsonLd data={schemaData} />

      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.analysis.title, url: "/analysis" }, { name: article.title, url: `/analysis/${article.slug}` }]} />

      <Link
        href={withLang("/analysis", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.analysis.backTo}
      </Link>

      {/* Standing disclaimer (spec section 2B) */}
      <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted">
        Analysis is coverage &amp; analysis, NOT betting advice.
      </p>

      <header className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block rounded-md border border-brand/30 bg-brand/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-brand">
            {article.kind}
          </span>
          <span className="text-xs text-muted">{article.league}</span>
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          <time dateTime={article.published_at}>{published}</time>
          {" \u00b7 "}{article.byline}
        </p>
        {/* AI disclosure (spec section 2C) */}
        <p className="mt-1 text-xs text-muted/70 italic">
          Phân tích do WildlyPlay Desk (AI) thực hiện
        </p>
      </header>

      {/* Hero image */}
      {article.hero_image && (
        <div className="mt-6 overflow-hidden rounded-card">
          <img
            src={article.hero_image}
            alt={article.title}
            width={1200}
            height={630}
            className="w-full"
            loading="eager"
          />
        </div>
      )}

      <hr className="my-6 border-line" />

      <div className="prose-md mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="table-wrap"><table>{children}</table></div>
            ),
          }}
        >
          {article.body.replace(/^\s*[-*]{3,}\s*\n/gm, "")}
        </ReactMarkdown>
      </div>

      {/* Linked pick funnel-card (spec section 2C): link TO the pick, not embed record */}
      {article.linked_pick_id && (
        <div className="mt-8">
          <Link
            href={withLang(`/play/${article.linked_pick_id}`, lang)}
            className="inline-flex items-center gap-2 rounded-card border border-brand/30 bg-brand/5 px-4 py-3 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            {dict.pick.viewPlay} &rarr;
          </Link>
        </div>
      )}

      {/* Internal links */}
      <nav className="mt-8 flex flex-wrap gap-3 text-xs">
        <Link href={withLang("/analysis", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.analysis} &rarr;
        </Link>
        <Link href={withLang("/competitions", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.matches} &rarr;
        </Link>
      </nav>

      {/* Firewall: Desk articles do NOT show Curator/Scout record (spec section 2C) */}
      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        Phân tích do WildlyPlay Desk (AI) thực hiện. Analysis is coverage &amp; analysis, NOT betting advice.
      </p>
    </article>
  );
}

export default async function AnalysisArticlePage({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);

  // Try Desk article first
  const deskArticle = await getAnalysisArticleBySlug(slug);
  if (deskArticle) {
    return <DeskArticleView article={deskArticle} lang={lang} dict={dict} />;
  }

  // Fall back to posts table (existing behavior)
  const post = await getPost(slug, lang);
  if (!post) notFound();

  const published = post.published_at
    ? new Intl.DateTimeFormat(locales[lang], {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(post.published_at))
    : null;

  const schemaData = buildArticleSchema(
    post.meta_title ?? post.title,
    post.meta_description ?? undefined,
    post.published_at,
    postByline(post),
    slug,
    lang,
  );

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <JsonLd data={schemaData} />

      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.analysis.title, url: "/analysis" }, { name: post.title, url: `/analysis/${slug}` }]} />

      <Link
        href={withLang("/analysis", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.analysis.backTo}
      </Link>

      {/* Standing disclaimer (spec section 2B) */}
      <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted">
        Analysis is coverage &amp; analysis, NOT betting advice.
      </p>

      <header className="mt-6">
        {post.pick_ids.length === 0 && (
          <span className="mb-3 inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            {dict.watching.badge}
          </span>
        )}
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
        {published && (
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.published_at ?? undefined}>{published}</time>
            {" \u00b7 "}{postByline(post)}
          </p>
        )}
      </header>

      {/* Hero card */}
      <div className="mt-6 overflow-hidden rounded-card">
        <img
          src={`/api/og/news/${slug}`}
          alt={post.title}
          width={1200}
          height={630}
          className="w-full"
          loading="eager"
        />
      </div>

      <hr className="my-6 border-line" />

      <div className="prose-md mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="table-wrap"><table>{children}</table></div>
            ),
          }}
        >
          {post.body_md.replace(/^\s*[-*]{3,}\s*\n/gm, "")}
        </ReactMarkdown>
      </div>

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {post.pick_ids.map((id) => (
          <Link
            key={id}
            href={withLang(`/play/${id}`, lang)}
            className={post.author === "scout" ? "font-display text-sm font-semibold text-scout transition-colors hover:text-ink" : "font-display text-sm font-semibold text-brand transition-colors hover:text-ink"}
          >
            {dict.pick.viewPlay} &rarr;
          </Link>
        ))}
        <MatchLink slug={slug} lang={lang} />
      </div>

      <RelatedArticles slug={slug} lang={lang} currentType={post.type} pickIds={post.pick_ids} />

      {/* Internal links */}
      <nav className="mt-8 flex flex-wrap gap-3 text-xs">
        <Link href={withLang("/track-record", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.trackRecord} &rarr;
        </Link>
        <Link href={withLang("/analysis", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.analysis} &rarr;
        </Link>
        <Link href={withLang("/learn", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.learn} &rarr;
        </Link>
        <Link href={withLang("/competitions", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.matches} &rarr;
        </Link>
      </nav>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {post.pick_ids.length === 0
          ? dict.watching.disclosureWatching
          : post.author === "scout" ? dict.pick.disclosureScout : dict.pick.disclosure}
      </p>
    </article>
  );
}

async function RelatedArticles({
  slug,
  lang,
  currentType,
  pickIds,
}: {
  slug: string;
  lang: Lang;
  currentType: string;
  pickIds: string[];
}) {
  if (pickIds.length === 0) return null;

  const { getPostsByPickIds } = await import("@/lib/data");
  let related;
  try {
    related = await getPostsByPickIds(pickIds, lang);
  } catch {
    return null;
  }

  const others = related.filter(
    (p: { slug: string; type: string }) => p.slug !== slug && p.type !== currentType,
  );
  if (others.length === 0) return null;

  const typeLabels: Record<string, string> = {
    preview: "Pre-match Preview",
    recap: "Match Recap",
    analysis: "Analysis",
    news: "News",
    "post-mortem": "Post-Mortem",
  };

  return (
    <nav className="mt-8 rounded-lg border border-line bg-card/50 p-4">
      <h3 className="mb-3 font-display text-sm font-bold text-muted">Related</h3>
      <ul className="space-y-2">
        {others.slice(0, 3).map((p: { slug: string; title: string; type: string }) => (
          <li key={p.slug}>
            <Link
              href={withLang(`/analysis/${p.slug}`, lang)}
              className="text-sm text-brand transition-colors hover:text-ink"
            >
              {typeLabels[p.type] ?? p.type}: {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function MatchLink({ slug, lang }: { slug: string; lang: Lang }) {
  if (slug.startsWith("no-play-")) return null;
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx < 0) return null;
  const prefixes = ["news-", "preview-", "recap-", "analysis-", "post-mortem-", "no-play-"];
  let matchPart = slug;
  for (const p of prefixes) {
    if (slug.startsWith(p)) {
      matchPart = slug.slice(p.length);
      break;
    }
  }
  const dateMatch = matchPart.match(/(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) return null;
  const candidateSlug = matchPart;
  let match;
  try {
    match = await getMatchBySlug(candidateSlug);
  } catch { return null; }
  if (!match) return null;
  const dict = getDict(lang);
  return (
    <Link
      href={withLang(`/match/${candidateSlug}`, lang)}
      className="font-display text-sm font-semibold text-muted transition-colors hover:text-brand"
    >
      {dict.match.viewMatch} &rarr;
    </Link>
  );
}
