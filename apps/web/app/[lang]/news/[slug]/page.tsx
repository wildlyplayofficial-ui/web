import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getNewsItemBySlug, getHeadline, getBody, getKickoffByMatchId } from "@/lib/news";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { LocalDate } from "@/components/local-date";
import { LocalKickoffTime } from "@/components/local-kickoff-time";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";

export const revalidate = 300;

const BASE = "https://www.wildlyplay.com";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const item = await getNewsItemBySlug(slug);
  if (!item) return { title: "Not found" };

  const headline = getHeadline(item, lang);
  const body = getBody(item, lang);
  const description = body
    ? body.replace(/[#*_>`\[\]()!]/g, "").replace(/\n+/g, " ").trim().slice(0, 160)
    : headline;

  const canonical = `${BASE}${withLang(`/news/${slug}`, lang)}`;
  const alternates = buildAlternates(`/news/${slug}`, lang);

  return {
    title: headline,
    description,
    alternates: { canonical, languages: alternates.languages },
    openGraph: {
      title: headline,
      description,
      type: "article",
      publishedTime: item.published_at,
      images: item.hero_card_url
        ? [{ url: item.hero_card_url, width: 1200, height: 630 }]
        : [{ url: `/api/og/news/${slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: headline,
      description,
    },
  };
}

function buildArticleSchema(
  headline: string,
  item: { published_at: string; byline: string },
  slug: string,
  lang: Lang,
) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    datePublished: item.published_at,
    dateModified: item.published_at,
    mainEntityOfPage: `${BASE}${withLang(`/news/${slug}`, lang)}`,
    author: {
      "@type": "Organization",
      name: item.byline || "WildlyPlay News",
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

export default async function NewsDetail({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const dict = getDict(lang);
  const item = await getNewsItemBySlug(slug);
  if (!item) notFound();

  const headline = getHeadline(item, lang);
  const body = getBody(item, lang);
  const kickoffUtc = item.match_id ? await getKickoffByMatchId(item.match_id) : null;

  // JSON-LD: built from our own DB fields, JSON.stringify + escape ensures safety
  const schema = JSON.stringify(
    buildArticleSchema(headline, item, slug, lang),
  ).replace(/</g, "\\u003c");

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />

      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: dict.news.title, url: "/news" },
          { name: headline, url: `/news/${slug}` },
        ]}
      />

      <Link
        href={withLang("/news", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.news.backToNews}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
          {headline}
        </h1>
        <p className="mt-3 text-sm text-muted">
          <LocalDate iso={item.published_at} locale={locales[lang]} format="long" />
          {" \u00b7 "}{item.byline || "WildlyPlay News"}
        </p>
        {kickoffUtc && (
          <p className="mt-1 text-sm text-muted">
            &#9917; <LocalKickoffTime iso={kickoffUtc} showDate />
          </p>
        )}
      </header>

      <div className="mt-6 overflow-hidden rounded-card">
        <img
          src={item.hero_card_url || `/api/og/news/${slug}`}
          alt={headline}
          width={1200}
          height={630}
          className="w-full"
          loading="eager"
        />
      </div>

      <hr className="my-6 border-line" />

      {body ? (
        <div className="prose-md mt-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="table-wrap"><table>{children}</table></div>
              ),
            }}
          >
            {body.replace(/^\s*[-*]{3,}\s*\n/gm, "")}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="mt-8 text-muted">{dict.news.empty}</p>
      )}

      {/* Internal links */}
      <nav className="mt-8 flex flex-wrap gap-3 text-xs">
        <Link href={withLang("/news", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.news.title} &rarr;
        </Link>
        <Link href={withLang("/analysis", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.analysis} &rarr;
        </Link>
        <Link href={withLang("/competitions", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.standings} &rarr;
        </Link>
      </nav>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        {dict.watching.disclosureWatching}
      </p>
    </article>
  );
}
