import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { getFixtureBySlug } from "@/lib/data";
import { teamFlag } from "@/lib/flags";
import { teamBadge } from "@/lib/team-badges";
import { formatKickoff } from "@/lib/format";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { buildSportsEvent, buildFAQPage } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/brand";

// pSEO pillar (Jane 22/8): a real, indexable page for EVERY scheduled fixture —
// independent of whether it has a pick. Editorial "nhận định", not betting content.
// Nick 22/8: deliberately a SEPARATE page from /match — different content, never merged.
export const revalidate = 300;

const BASE = SITE_URL;

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const fixture = await getFixtureBySlug(slug);
  if (!fixture) return { title: "Not found" };

  const title = `Nhận định ${fixture.homeTeam} vs ${fixture.awayTeam}${fixture.competitionName ? ` — ${fixture.competitionName}` : ""}`;
  const description = `${fixture.homeTeam} vs ${fixture.awayTeam}: giờ đá, thông tin trận đấu${fixture.competitionName ? ` tại ${fixture.competitionName}` : ""}. Cập nhật tỉ số và diễn biến trên banhbong.net.`;
  const ogImage = `/api/og/match/${slug}`;

  return {
    title,
    description,
    openGraph: { title: `${title} | banhbong.net`, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${title} | banhbong.net`, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
    alternates: buildAlternates(`/nhan-dinh/${slug}`, lang),
  };
}

function faqsFor(fixture: NonNullable<Awaited<ReturnType<typeof getFixtureBySlug>>>, kickoffLabel: string) {
  const faqs = [
    {
      question: `${fixture.homeTeam} vs ${fixture.awayTeam} đá lúc mấy giờ?`,
      answer: `Trận ${fixture.homeTeam} vs ${fixture.awayTeam} diễn ra lúc ${kickoffLabel}${fixture.competitionName ? ` trong khuôn khổ ${fixture.competitionName}` : ""}.`,
    },
  ];
  if (fixture.venue) {
    faqs.push({
      question: `Trận ${fixture.homeTeam} vs ${fixture.awayTeam} diễn ra ở đâu?`,
      answer: `Trận đấu diễn ra tại ${fixture.venue}.`,
    });
  }
  if (fixture.status === "finished" || (fixture.homeScore !== null && fixture.awayScore !== null && fixture.status !== "scheduled")) {
    faqs.push({
      question: `Kết quả ${fixture.homeTeam} vs ${fixture.awayTeam}?`,
      answer: `${fixture.homeTeam} ${fixture.homeScore} - ${fixture.awayScore} ${fixture.awayTeam}.`,
    });
  }
  return faqs;
}

export default async function NhanDinhPage({ params }: Props) {
  const { slug, lang: rawLang } = await params;
  const lang = resolveLang(rawLang);
  const fixture = await getFixtureBySlug(slug);
  if (!fixture) notFound();

  const homeFlag = teamFlag(fixture.homeTeam);
  const awayFlag = teamFlag(fixture.awayTeam);
  const homeBadge = teamBadge(fixture.homeTeam);
  const awayBadge = teamBadge(fixture.awayTeam);
  const kickoffLabel = formatKickoff(fixture.kickoffUtc, lang);
  const isFinished = fixture.homeScore !== null && fixture.awayScore !== null && fixture.status !== "scheduled";

  const eventSchema = buildSportsEvent({
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    league: fixture.competitionName,
    kickoffUtc: fixture.kickoffUtc,
    location: fixture.venue ?? undefined,
  });
  const faqSchema = buildFAQPage(faqsFor(fixture, kickoffLabel));
  const schemaScript = JSON.stringify([eventSchema, faqSchema]).replace(/</g, "\\u003c");

  return (
    <article className="mx-auto max-w-[720px] px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaScript }} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Nhận định", url: "/nhan-dinh" },
          { name: `${fixture.homeTeam} vs ${fixture.awayTeam}`, url: `/nhan-dinh/${slug}` },
        ]}
      />
      <Link href={withLang("/matches", lang)} className="text-sm text-muted transition-colors hover:text-brand">
        &larr; Tất cả trận đấu
      </Link>

      <header className="mt-6">
        <p className="text-sm text-muted">
          {fixture.competitionName}
          {fixture.competitionName ? " · " : ""}
          {kickoffLabel}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
          {homeBadge ? (
            <img src={homeBadge} alt="" width={28} height={28} className="mr-1.5 inline-block h-7 w-7 object-contain align-[-5px]" />
          ) : homeFlag ? (
            <span className="mr-1.5">{homeFlag}</span>
          ) : null}
          {fixture.homeTeam}
          <span className="mx-2 text-muted">vs</span>
          {awayBadge ? (
            <img src={awayBadge} alt="" width={28} height={28} className="mr-1.5 inline-block h-7 w-7 object-contain align-[-5px]" />
          ) : awayFlag ? (
            <span className="mr-1.5">{awayFlag}</span>
          ) : null}
          {fixture.awayTeam}
        </h1>

        {isFinished && (
          <div className="mt-3 flex items-center gap-3">
            <span className="font-display text-2xl font-bold text-ink">
              {fixture.homeScore}&ndash;{fixture.awayScore}
            </span>
            <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold uppercase text-muted">
              {fixture.status === "live" ? "Đang diễn ra" : "Kết thúc"}
            </span>
          </div>
        )}
      </header>

      <section className="mt-8 rounded-card border border-line bg-card p-6 shadow-card">
        <h2 className="mb-3 font-display text-lg font-bold">Thông tin trận đấu</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Giải đấu</dt>
          <dd className="text-ink">{fixture.competitionName || "—"}</dd>
          <dt className="text-muted">Giờ đá</dt>
          <dd className="text-ink">{kickoffLabel}</dd>
          {fixture.venue && (
            <>
              <dt className="text-muted">Sân vận động</dt>
              <dd className="text-ink">{fixture.venue}</dd>
            </>
          )}
        </dl>
      </section>

      {fixture.matchSlug && (
        <section className="mt-6 rounded-card border border-brand/30 bg-brand/5 p-6">
          <h2 className="mb-2 font-display text-lg font-bold">Có phân tích &amp; dự đoán cho trận này</h2>
          <p className="mb-3 text-sm text-muted">Đội ngũ đã có bài phân tích kèo/dự đoán riêng cho trận đấu này.</p>
          <Link href={withLang(`/match/${fixture.matchSlug}`, lang)} className="text-sm font-semibold text-brand transition-colors hover:text-ink">
            Xem phân tích &amp; dự đoán &rarr;
          </Link>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Câu hỏi thường gặp</h2>
        <div className="flex flex-col gap-3">
          {faqsFor(fixture, kickoffLabel).map((faq) => (
            <div key={faq.question} className="rounded-card border border-line bg-card p-4">
              <p className="font-semibold text-ink">{faq.question}</p>
              <p className="mt-1 text-sm text-muted">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
