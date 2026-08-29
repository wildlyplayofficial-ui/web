// Mục BLOG — bóng đá nói chung, KHÔNG dạy cá cược.
// Tách khỏi /guides vì 6 bài hướng dẫn đang bị cố ý ẩn khỏi Google (Nick+Peter 28/7)
// và cả mục đó không đăng fanpage được (trang bị chặn tuổi). Xem PR mục Blog 29/8.
import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { getBlogs } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { Post } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const canonical = withLang("/blog", lang);
  return {
    title: dict.blog.title,
    description: dict.blog.seoDescription,
    alternates: { canonical },
    openGraph: {
      title: `${dict.blog.title} | banhbong.net`,
      description: dict.blog.seoDescription,
      images: [{ url: `/api/og/editorial?title=Blog&subtitle=B%C3%B3ng%20%C4%91%C3%A1%20m%E1%BB%97i%20ng%C3%A0y&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.blog.title} | banhbong.net`,
      description: dict.blog.seoDescription,
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

function extractExcerpt(body: string | null, maxLen = 140): string {
  if (!body) return "";
  const plain = body.replace(/[#*_`>\[\]()!]/g, "").replace(/\n+/g, " ").trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.lastIndexOf(" ", maxLen);
  return plain.slice(0, cut > 0 ? cut : maxLen) + "\u2026";
}

function BlogCard({ post, lang }: { post: Post; lang: Lang }) {
  const excerpt = post.meta_description || extractExcerpt(post.body_md);
  return (
    <Link
      href={withLang(`/blog/${post.slug}`, lang)}
      className="group rounded-card border border-line bg-card p-6 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
    >
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="rounded-full border border-brand/40 px-2 py-0.5 font-display font-semibold text-brand">
          Guide
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
    </Link>
  );
}

export default async function GuidesPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const guides = await getBlogs(lang);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.blog.title, url: "/blog" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.blog.title}</h1>
        <p className="mt-3 text-muted">{dict.blog.subtitle}</p>
      </section>

      {guides.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.blog.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {guides.map((post) => (
            <BlogCard key={post.id} post={post} lang={lang} />
          ))}
          <p className="pt-2 text-center text-sm text-muted">
            Put it into practice with our{" "}
            <Link href={withLang("/calculators", lang)} className="font-semibold text-brand hover:underline">
              free calculators &rarr;
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
