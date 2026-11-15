import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { fetchCompetitionTable } from "@/lib/standings";
import { dongDanDau, duDoanCuaGiai } from "@/lib/giai-dan-dau";

export const revalidate = 3600;

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.standings.title,
    description: dict.standings.subtitle,
    openGraph: {
      locale: "vi_VN",
      title: `${dict.standings.title} | banhbong.net`,
      description: dict.standings.subtitle,
      images: [{ url: `/api/og/editorial?title=Competitions&subtitle=Standings%2C%20fixtures%2C%20and%20predictions%20by%20league&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/competitions", lang),
  };
}

const COMP_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  "world-cup-2026": { border: "border-brand/40", bg: "bg-brand-dim/30", text: "text-brand" },
  mls: { border: "border-blue-400/40", bg: "bg-blue-400/10", text: "text-blue-400" },
  "liga-mx": { border: "border-emerald-400/40", bg: "bg-emerald-400/10", text: "text-emerald-400" },
};

const DEFAULT_COLORS = { border: "border-line", bg: "bg-card", text: "text-muted" };

export default async function CompetitionsHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const competitions = await getStandingsCompetitions().catch(() => []);
  const active = competitions.filter((c) => c.status === "active" && c.slug);
  // 16/11: trang chỉ còn ~62 chữ. Mỗi giải thêm 1 dòng đội đầu bảng (số thật từ BXH, đã đệm 1 giờ);
  // lỗi hoặc bảng rỗng → không hiện gì.
  const danDau = lang === "vi"
    ? await Promise.all(active.map((c) => fetchCompetitionTable(c.livescoreId).then(dongDanDau).catch(() => null)))
    : active.map(() => null);

  return (
    <div className="mx-auto max-w-[800px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.standings.title, url: "/competitions" }]} />
      <section className="py-12 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.standings.title}</h1>
        <p className="mt-3 text-muted">{dict.standings.subtitle}</p>
        {lang === "vi" && (
          <p className="mx-auto mt-4 max-w-[600px] text-sm leading-relaxed text-ink">
            {"Mỗi giải có bảng xếp hạng, lịch thi đấu và phong độ 5 trận gần nhất, cập nhật mỗi giờ. Tỷ số dự đoán và Over/Under từng trận nằm ở trang "}
            <Link href={withLang("/du-doan", lang)} className="font-semibold text-brand hover:underline">dự đoán bóng đá hôm nay</Link>
            {", chia theo giải."}
          </p>
        )}
      </section>

      {active.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.standings.empty}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((comp, i) => {
            const colors = COMP_COLORS[comp.slug] ?? DEFAULT_COLORS;
            const dd = lang === "vi" ? duDoanCuaGiai(comp.slug) : null;
            return (
              <div key={comp.id}>
              <Link
                href={withLang(`/competitions/${comp.slug}`, lang)}
                className={`group flex items-center justify-between rounded-card border ${colors.border} ${colors.bg} p-6 transition-colors hover:border-brand/60`}
              >
                <div>
                  <h2 className="font-display text-xl font-bold transition-colors group-hover:text-brand">
                    {comp.name}
                  </h2>
                  {comp.season && (
                    <p className="mt-1 text-sm text-muted">{comp.season}</p>
                  )}
                </div>
                <span className={`shrink-0 font-display text-sm font-semibold ${colors.text}`}>
                  {dict.nav.standings} &rarr;
                </span>
              </Link>
              {(danDau[i] || dd) && (
                <p className="mt-2 px-1 text-sm leading-relaxed text-muted">
                  {danDau[i] && <span className="text-ink">{danDau[i]} </span>}
                  {dd && (
                    <Link href={withLang(`/du-doan/${dd.slug}`, lang)} className="font-semibold text-brand hover:underline">
                      {`Dự đoán ${dd.ten}`}
                    </Link>
                  )}
                </p>
              )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
