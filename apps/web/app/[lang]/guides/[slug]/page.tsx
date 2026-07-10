import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost, getPostLangs } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

/** Static concept-diagram SVGs for each guide topic (spec §4). */
const GUIDE_DIAGRAMS: Record<string, string> = {
  "what-is-asian-handicap": "asian-handicap.svg",
  "how-de-vigging-works": "de-vig-methods.svg",
  "what-is-devigging": "de-vig-intro.svg",
  "what-is-closing-line-value": "closing-line-value.svg",
  "kelly-criterion-betting": "kelly-criterion.svg",
  "what-is-value-betting": "value-betting.svg",
  "how-to-read-betting-odds": "odds-anatomy.svg",
  "odds-formats-explained": "odds-formats.svg",
  "what-makes-a-good-tipster": "good-tipster.svg",
  "no-play-discipline": "no-play-discipline.svg",
  "responsible-play-guide": "responsible-play.svg",
};

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
  const canonical = `${BASE}${withLang(`/guides/${slug}`, lang)}`;

  const availableLangs = await getPostLangs(slug);
  const languages: Record<string, string> = {};
  for (const l of availableLangs) {
    languages[l] = `${BASE}${withLang(`/guides/${slug}`, l)}`;
  }
  if (availableLangs.includes("en")) {
    languages["x-default"] = `${BASE}/guides/${slug}`;
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
      images: [{ url: `/api/og/guide?slug=${slug}&title=${encodeURIComponent(title)}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: `/api/og/guide?slug=${slug}&title=${encodeURIComponent(title)}`, width: 1200, height: 630 }],
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
    mainEntityOfPage: `${BASE}${withLang(`/guides/${slug}`, lang)}`,
    image: `${BASE}/api/og/news/${slug}`,
    author: {
      "@type": "Organization",
      name: "WildlyPlay",
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

export default async function GuidePage({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const post = await getPost(slug, lang);
  if (!post || post.type !== "guide") notFound();

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
      {/* JSON-LD: server-controlled data only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <Link
        href={withLang("/guides", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.guides.backToGuides}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
        {published && (
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.published_at ?? undefined}>{published}</time>
            {" \u00b7 WildlyPlay"}
          </p>
        )}
      </header>

      {/* Hero: concept diagram SVG (static asset, evergreen) */}
      {GUIDE_DIAGRAMS[slug] && (
        <div className="mt-6 overflow-hidden rounded-card border border-line">
          <img
            src={`/images/guides/${GUIDE_DIAGRAMS[slug]}`}
            alt={post.title}
            width={800}
            height={400}
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
            a: ({ href, children, ...rest }) => {
              if (href?.startsWith("/")) {
                return <Link href={withLang(href, lang)} {...rest}>{children}</Link>;
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
            },
          }}
        >
          {post.body_md.replace(/^\s*[-*]{3,}\s*\n/gm, "")}
        </ReactMarkdown>
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
