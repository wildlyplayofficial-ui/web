import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPost } from "@/lib/data";
import { getDict, resolveLang, withLang } from "@/lib/i18n";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const lang = resolveLang(sp.lang);
  const post = await getPost(slug, lang);
  if (!post) return { title: "Not found" };
  const description = post.body_md.replace(/[#*_>\-`]/g, "").trim().slice(0, 160);
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
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
    ? new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(post.published_at))
    : null;

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
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
            {" · WildlyPlay "}
            {dict.news.title}
          </p>
        )}
      </header>

      <div className="prose-md mt-8">
        <ReactMarkdown>{post.body_md}</ReactMarkdown>
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">{dict.pick.disclosure}</p>
    </article>
  );
}
