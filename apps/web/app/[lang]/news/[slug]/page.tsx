import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost, getPostLangs, getMatchBySlug } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const post = await getPost(slug, lang);
  if (!post) return { title: "Not found" };

  const title = post.meta_title ?? post.title;
  const description = post.meta_description
    ?? post.body_md.replace(/[#*_>\-`]/g, "").trim().slice(0, 160);
  const canonical = `${BASE}${withLang(`/news/${slug}`, lang)}`;

  const availableLangs = await getPostLangs(slug);
  const languages: Record<string, string> = {};
  for (const l of availableLangs) {
    languages[l] = `${BASE}${withLang(`/news/${slug}`, l)}`;
  }
  if (availableLangs.includes("en")) {
    languages["x-default"] = `${BASE}/news/${slug}`;
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

function buildArticleSchema(post: {
  title: string;
  meta_title?: string | null;
  meta_description?: string | null;
  published_at: string | null;
  lang: string;
}, slug: string, lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.meta_title ?? post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.published_at ?? undefined,
    inLanguage: post.lang,
    mainEntityOfPage: `${BASE}${withLang(`/news/${slug}`, lang)}`,
    image: `${BASE}/api/og/news/${slug}`,
    author: {
      "@type": "Organization",
      name: "The Curator @ WildlyPlay",
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

export default async function NewsPost({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
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

  const schema = JSON.stringify(buildArticleSchema(post, slug, lang)).replace(/</g, '\\u003c');

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <Link
        href={withLang("/news", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.news.backToNews}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
        {published && (
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.published_at ?? undefined}>{published}</time>
            {" \u00b7 The Curator @ WildlyPlay"}
          </p>
        )}
      </header>

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
            className="font-display text-sm font-semibold text-brand transition-colors hover:text-ink"
          >
            {dict.pick.viewPlay} &rarr;
          </Link>
        ))}
        <MatchLink slug={slug} lang={lang} />
      </div>

      <RelatedArticles slug={slug} lang={lang} currentType={post.type} pickIds={post.pick_ids} />

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {post.author === "scout" ? dict.pick.disclosureScout : dict.pick.disclosure}
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

  const dict = getDict(lang);
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
              href={withLang(`/news/${p.slug}`, lang)}
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
