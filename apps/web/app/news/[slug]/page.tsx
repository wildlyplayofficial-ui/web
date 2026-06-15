import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPost, getPostLangs } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
  const post = await getPost(slug, lang);
  if (!post) return { title: "Not found" };

  const title = post.meta_title ?? post.title;
  const description = post.meta_description
    ?? post.body_md.replace(/[#*_>\-`]/g, "").trim().slice(0, 160);
  const canonical = `${BASE}${withLang(`/news/${slug}`, lang)}`;

  // hreflang: only langs that actually have a post for this slug
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
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: ["/api/og/home"],
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
    "@type": "Article",
    headline: post.meta_title ?? post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.published_at ?? undefined,
    inLanguage: post.lang,
    mainEntityOfPage: `${BASE}${withLang(`/news/${slug}`, lang)}`,
    image: `${BASE}/api/og/home`,
    author: {
      "@type": "Organization",
      name: "The Curator @ WildlyPlay",
      url: BASE,
    },
    publisher: {
      "@type": "Organization",
      name: "WildlyPlay",
      url: BASE,
    },
  };
}

export default async function NewsPost({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
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

  // Article schema — escape < to prevent script breakout from AI-generated content
  const schema = JSON.stringify(buildArticleSchema(post, slug, lang)).replace(/</g, '\\u003c');

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      {/* Schema is built from DB fields (title, dates, lang) — no user-generated HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <Link
        href={withLang("/news", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        ← {dict.news.backToNews}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
        {published && (
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.published_at ?? undefined}>{published}</time>
            {" · The Curator @ WildlyPlay"}
          </p>
        )}
      </header>

      <div className="prose-md mt-8">
        <ReactMarkdown>{post.body_md}</ReactMarkdown>
      </div>

      {post.pick_ids.length > 0 && (
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {post.pick_ids.map((id) => (
            <Link
              key={id}
              href={withLang(`/play/${id}`, lang)}
              className="font-display text-sm font-semibold text-brand transition-colors hover:text-ink"
            >
              {dict.pick.viewPlay} →
            </Link>
          ))}
        </p>
      )}

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
