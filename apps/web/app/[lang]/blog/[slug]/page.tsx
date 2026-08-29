// Trang bài BLOG. Cùng khuôn với /guides nhưng BỎ hai thứ riêng của guide:
// sơ đồ khái niệm cá cược, và luật ẩn bản tiếng Việt (Nick+Peter 28/7).
// Blog là bóng đá thường nên index bình thường.
import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost } from "@/lib/data";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, LANGS, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

const BASE = "https://www.banhbong.net";


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
  const canonical = `${BASE}${withLang(`/blog/${slug}`, lang)}`;

  // hreflang chỉ khai bản tiếng Việt (Peter chốt 25/8, nối tiếp đợt gỡ 23/8). Bảng
  // `posts` vẫn giữ hàng en/th/es cho công cụ dịch trong admin, nên getPostLangs trả
  // về cả 4 — khai ra là trỏ Google vào /en /th /es đã 301, tự dựng chuỗi chuyển
  // hướng cho chính mình. Đo trên prod 26/8: 690 thẻ hreflang hỏng trên 237 trang.
  const { languages } = buildAlternates(`/blog/${slug}`, lang);

  return {
    title,
    description,
    // Bản VI của 6 guide nặng thuật ngữ cá cược → noindex để không lộ trên search VN.
    // 5 guide còn lại + mọi ngôn ngữ khác index bình thường. (Nick chốt danh sách 4/8)
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: [{ url: `/api/og/guide?slug=${slug}&title=${encodeURIComponent(title)}&locale=${lang}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: `/api/og/guide?slug=${slug}&title=${encodeURIComponent(title)}&locale=${lang}&v=${OG_VERSION}`, width: 1200, height: 630 }],
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
    mainEntityOfPage: `${BASE}${withLang(`/blog/${slug}`, lang)}`,
    image: `${BASE}/api/og/news/${slug}?locale=${lang}&v=${OG_VERSION}`,
    author: {
      "@type": "Organization",
      name: "banhbong.net",
      url: BASE,
    },
    publisher: {
      "@type": "Organization",
      name: "banhbong.net",
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

  // Schema built from DB field names only — no user-generated HTML. < escaped to prevent injection.
  const schema = JSON.stringify(buildArticleSchema(post, slug, lang)).replace(/</g, "\\u003c");

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      {/* JSON-LD: server-controlled data only, no user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.blog.title, url: "/blog" }, { name: post.title, url: `/blog/${slug}` }]} />

      <Link
        href={withLang("/blog", lang)}
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        &larr; {dict.blog.backToBlog}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
        {published && (
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.published_at ?? undefined}>{published}</time>
            {" \u00b7 banhbong.net"}
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

      {/* A4: Internal-linking hub→spoke */}
      <nav className="mt-8 flex flex-wrap gap-3 text-xs">
        <Link href={withLang("/learn", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.learn} &rarr;
        </Link>
        <Link href={withLang("/calculators", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.calculators} &rarr;
        </Link>
        <Link href={withLang("/track-record", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
          {dict.nav.trackRecord} &rarr;
        </Link>
      </nav>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
