import type { Metadata } from "next";
import Link from "next/link";
import { getReports } from "@/lib/data";
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
  const canonical = withLang("/transparency", lang);
  return {
    title: dict.transparency.title,
    description: dict.transparency.subtitle,
    alternates: { canonical },
    openGraph: { title: `${dict.transparency.title} | WildlyPlay`, description: dict.transparency.subtitle },
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

function ReportCard({ post, lang }: { post: Post; lang: Lang }) {
  const excerpt = post.meta_description ?? "";
  return (
    <Link
      href={withLang(`/transparency/${post.slug}`, lang)}
      className="group rounded-card border border-line bg-card p-6 shadow-card transition-colors hover:border-line-hover hover:bg-card-hover"
    >
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="rounded-full border border-brand/40 px-2 py-0.5 font-display font-semibold text-brand">
          Report
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

export default async function TransparencyPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const reports = await getReports(lang);

  return (
    <div className="mx-auto max-w-[800px] px-5">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.transparency.title, url: "/transparency" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.transparency.title}</h1>
        <p className="mt-3 text-muted">{dict.transparency.subtitle}</p>
      </section>

      {reports.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.transparency.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {reports.map((post) => (
            <ReportCard key={post.id} post={post} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
