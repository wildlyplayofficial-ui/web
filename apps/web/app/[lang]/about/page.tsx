import type { Metadata } from "next";
import { OG_VERSION, PETE } from "@/lib/brand";
import { authorByName } from "@/lib/authors";
import Link from "next/link";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { buildPerson, buildOrganization, buildWebSite } from "@/lib/jsonld";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DoiNguChuyenGia } from "@/components/doi-ngu-chuyen-gia";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { isFeatureEnabled } from "@/lib/data";
import { copy } from "./copy";

/**
 * /about soạn lại 11/11/2026 (Peter): giới thiệu trang DỰ ĐOÁN — có gì, đội ngũ 5 chuyên gia
 * (neo #slug cho dòng "Dự đoán bởi" trên trang trận), cách dự đoán, cam kết. Bỏ thẻ Chú Tám,
 * mục thành tích công khai (Peter không công khai thành tích), công cụ và đường dây hỗ trợ.
 */
export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const c = copy[lang];
  return {
    // metaTitle có từ khoá (khác H1). metaDescription viết đủ ý, không cắt intro giữa câu.
    title: c.metaTitle,
    description: c.metaDescription,
    openGraph: { locale: "vi_VN", title: `${c.title} | banhbong.net`, description: c.metaDescription, images: [{ url: `/api/og/editorial?title=${encodeURIComponent(c.title)}&subtitle=${encodeURIComponent(lang === "vi" ? "Dự đoán bóng đá mỗi ngày" : "Football predictions")}&v=${OG_VERSION}`, width: 1200, height: 630 }] },
    alternates: buildAlternates("/about", lang),
  };
}

const H2 = "font-display text-2xl font-bold";
const THE = "rounded-card border border-line bg-card p-5 shadow-card sm:p-6";

export default async function AboutPage({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const c = copy[lang];
  const competitions = await getStandingsCompetitions().catch(() => []);
  // Chỉ liệt kê giải có TRANG CÒN SỐNG. Trang giải gọi notFound() khi status khác
  // "active" và cờ standings_<slug> tắt (xem competitions/[slug]/page.tsx). Lọc theo
  // mỗi slug thì aff-cup, asian-cup, euro-qualifiers hiện trên /about mà bấm vào ra
  // 404 — đo tay 1/9/2026, cả ba đều 404. sitemap.ts đã áp đúng luật này từ 5/8,
  // /about thì chưa. Lỗi Supabase thì coi như tắt: thà thiếu một ô còn hơn ô gãy.
  const song = await Promise.all(
    competitions.map(async (comp) => {
      if (!comp.slug) return false;
      if (comp.status === "active") return true;
      try {
        return await isFeatureEnabled(`standings_${comp.slug.replace(/-/g, "_")}`);
      } catch {
        return false;
      }
    }),
  );
  const giaiHienDuoc = competitions.filter((_, i) => song[i]);
  const pete = lang === "vi" ? authorByName(PETE) : undefined;

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-5 sm:py-12">
      <BreadcrumbJsonLd items={[{name:"Home",url:"/"},{name:"About",url:"/about"}]} />
      {lang === "vi" && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildPerson(PETE)) }} />}
      {/* Organization + WebSite + AboutPage: giúp Google/AI hiểu đây là trang
          thực thể chính → dễ index + dễ được trích dẫn (thiếu trước 28/7). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganization()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSite()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: c.metaTitle,
        description: c.metaDescription,
        url: `https://www.banhbong.net${lang === "vi" ? "" : `/${lang}`}/about`,
        inLanguage: lang,
        isPartOf: { "@type": "WebSite", name: "banhbong.net", url: "https://www.banhbong.net" },
      }) }} />

      <h1 className="font-display text-3xl font-bold sm:text-4xl">{c.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink/90 sm:text-base">{c.intro}</p>

      <section className="mt-10">
        {c.cardsTitle && <h2 className={H2}>{c.cardsTitle}</h2>}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {c.cards.map((card) => {
            const ruot = (
              <>
                <h3 className="font-display text-lg font-semibold text-brand">{card.heading}{card.href && " →"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
              </>
            );
            return card.href ? (
              <Link key={card.heading} href={withLang(card.href, lang)} className={`${THE} block transition-colors hover:border-brand/50`}>{ruot}</Link>
            ) : (
              <div key={card.heading} className={THE}>{ruot}</div>
            );
          })}
        </div>
      </section>

      {lang === "vi" && <DoiNguChuyenGia />}

      <section className="mt-12">
        <h2 className={H2}>{c.methodTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.methodIntro}</p>
        <ol className="mt-5 flex flex-col gap-3">
          {c.methodSteps.map((step, i) => (
            <li key={step.title} className={THE}>
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-bg">{i + 1}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-card border border-line bg-card p-6 sm:p-8">
        <h2 className={H2}>{c.promiseTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {c.promises.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <span className="mt-0.5 text-brand">{"✓"}</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {giaiHienDuoc.length > 0 && (
        <section className="mt-12">
          <h2 className={H2}>{c.leaguesTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{c.leaguesIntro}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {giaiHienDuoc.map((comp) => (
              <Link key={comp.id} href={withLang(`/competitions/${comp.slug}`, lang)} className="rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-brand/50">
                <h3 className="font-display font-semibold text-ink">{comp.name}</h3>
                {comp.season && (
                  <p className="mt-1 text-xs text-muted">{c.leaguesSeason}: {comp.season}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg font-semibold text-muted">{c.contactTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.contactBody}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a href="https://t.me/banhbongnet" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">Telegram</a>
          <a href="https://www.facebook.com/xemthethaotructiep" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">Facebook</a>
        </div>
        {/* Pete Nguyễn biên tập tin + blog (Peter chốt 15/9) — từ 11/11 chỉ còn một dòng. */}
        {pete && (
          <p className="mt-6 text-xs text-muted">
            Biên tập: <Link href={pete.path} className="font-semibold text-ink hover:text-brand hover:underline">{pete.name}</Link>
          </p>
        )}
      </section>
    </div>
  );
}
