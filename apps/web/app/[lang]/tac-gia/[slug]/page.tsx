// Trang hồ sơ tác giả (Peter chốt 15/9/2026): /tac-gia/chu-tam-banh và /tac-gia/pete-nguyen.
// Byline trên bài trỏ về đây; schema author của bài là Person có url trang này.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OG_VERSION, PETE } from "@/lib/brand";
import { authorBySlug } from "@/lib/authors";
import { getArticlesByByline, type AuthorArticle } from "@/lib/author-articles";
import { getBlogs } from "@/lib/data";
import { buildPerson } from "@/lib/jsonld";
import { locales } from "@/lib/format";
import { resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const a = authorBySlug(slug);
  if (!a) return { title: "Not found" };
  const title = `${a.name} — ${a.role} | banhbong.net`;
  return {
    title,
    description: a.bio,
    alternates: { canonical: withLang(a.path, lang) },
    openGraph: {
      title,
      description: a.bio,
      type: "profile",
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(a.name)}&subtitle=${encodeURIComponent(a.role)}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const a = authorBySlug(slug);
  if (!a) notFound();

  const [articles, blogs] = await Promise.all([
    getArticlesByByline(a.name),
    a.name === PETE ? getBlogs(lang) : Promise.resolve([]),
  ]);
  const list: AuthorArticle[] = [
    ...articles,
    ...blogs.map((p) => ({ title: p.title, href: `/blog/${p.slug}`, published_at: p.published_at ?? "" })),
  ]
    .sort((x, y) => y.published_at.localeCompare(x.published_at))
    .slice(0, 20);

  const fmt = new Intl.DateTimeFormat(locales[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: buildPerson(a.name),
  }).replace(/</g, "\\u003c");

  return (
    <div className="mx-auto max-w-[800px] px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Giới thiệu", url: "/about" }, { name: a.name, url: a.path }]} />

      <header className="rounded-card border border-line bg-card p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Tác giả</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{a.name}</h1>
        <p className="mt-1 text-sm font-semibold text-muted">{a.role}</p>
        <p className="mt-4 leading-relaxed text-ink/90">{a.bio}</p>
        <p className="mt-4 text-xs italic text-muted">{a.disclosure}</p>
        <nav className="mt-5 flex flex-wrap gap-3 text-xs">
          {a.name !== PETE && (
            <Link href={withLang("/track-record", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
              Thành tích công khai &rarr;
            </Link>
          )}
          <Link href={withLang("/transparency", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
            Minh bạch &rarr;
          </Link>
          <Link href={withLang("/about", lang)} className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand">
            Về banhbong.net &rarr;
          </Link>
        </nav>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Bài mới của {a.name}</h2>
        {list.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Chưa có bài.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line rounded-card border border-line bg-card">
            {list.map((item) => (
              <li key={item.href}>
                <Link href={withLang(item.href, lang)} className="block px-5 py-3 transition-colors hover:bg-card-hover">
                  <span className="font-semibold text-ink">{item.title}</span>
                  {item.published_at && (
                    <time dateTime={item.published_at} className="mt-0.5 block text-xs text-muted">
                      {fmt.format(new Date(item.published_at))}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
