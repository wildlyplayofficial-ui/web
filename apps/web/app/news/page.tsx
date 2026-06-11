import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/data";
import { getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import type { Post } from "@/lib/types";

export const revalidate = 300;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  return {
    title: dict.news.title,
    description: dict.news.subtitle,
    openGraph: { title: `${dict.news.title} | WildlyPlay`, description: dict.news.subtitle },
  };
}

const typeLabels: Record<Post["type"], string> = {
  recap: "Recap",
  preview: "Preview",
  news: "News",
};

function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function Newsroom({ searchParams }: Props) {
  const lang = resolveLang((await searchParams).lang);
  const dict = getDict(lang);
  const posts = await getPosts(lang);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.news.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={withLang(`/news/${post.slug}`, lang)}
              className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-[#484f58] hover:bg-card-hover"
            >
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="rounded-full border border-indigo-soft/40 px-2 py-0.5 font-display font-semibold text-indigo-soft">
                  {typeLabels[post.type]}
                </span>
                <time dateTime={post.published_at ?? undefined}>
                  {formatDate(post.published_at, lang)}
                </time>
              </div>
              <h2 className="mt-3 font-display text-xl font-bold transition-colors group-hover:text-brand">
                {post.title}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
