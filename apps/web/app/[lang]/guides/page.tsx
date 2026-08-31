import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { getGuides } from "@/lib/data";
import { locales } from "@/lib/format";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { Post } from "@/lib/types";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { biaUrl, hasBia } from "@/lib/bia-guide";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const canonical = withLang("/guides", lang);
  return {
    title: dict.guides.title,
    description: dict.guides.seoDescription,
    alternates: { canonical },
    openGraph: {
      title: `${dict.guides.title} | banhbong.net`,
      description: dict.guides.seoDescription,
      images: [{ url: `/api/og/editorial?title=Learn%20%E2%80%94%20Betting%20Guides&subtitle=Free%20guides%20to%20sharpen%20your%20edge&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.guides.title} | banhbong.net`,
      description: dict.guides.seoDescription,
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

function GuideCard({ post, lang }: { post: Post; lang: Lang }) {
  const excerpt = post.meta_description || extractExcerpt(post.body_md);
  const bia = hasBia(post.slug, lang) ? biaUrl(post.slug, lang, post.title) : null;
  return (
    <Link
      href={withLang(`/guides/${post.slug}`, lang)}
      className="group flex gap-4 rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover sm:p-6"
    >
      {/* Ô ảnh luôn chiếm chỗ dù bài chưa có bìa — không thì thẻ có ảnh và thẻ
          không ảnh cao thấp so le, nhìn như hỏng. */}
      <div className="hidden h-[88px] w-[168px] shrink-0 self-start overflow-hidden rounded-lg border border-line sm:block">
        {bia ? (
          <img
            src={bia}
            alt={post.title}
            width={168}
            height={88}
            loading="lazy"
            className="h-[88px] w-full object-cover"
          />
        ) : (
          <div className="h-[88px] w-full bg-gradient-to-br from-brand/25 to-brand/5" />
        )}
      </div>

      <div className="min-w-0">
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
      </div>
    </Link>
  );
}

export default async function GuidesPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const guides = await getGuides(lang);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.guides.title, url: "/guides" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.guides.title}</h1>
        <p className="mt-3 text-muted">{dict.guides.subtitle}</p>
      </section>

      {guides.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.guides.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {guides.map((post) => (
            <GuideCard key={post.id} post={post} lang={lang} />
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
