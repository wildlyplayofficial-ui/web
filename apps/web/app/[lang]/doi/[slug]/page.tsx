import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getNewsByTeam, getHeadline, type NewsItem } from "@/lib/news";
import { getAnalysisByTeam } from "@/lib/analysis-articles";
import type { AnalysisArticle } from "@/lib/types";
import { getTeamHub, TEAM_HUBS } from "@/lib/teams";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { locales } from "@/lib/format";

/* eslint-disable @next/next/no-img-element */

export const revalidate = 300;

const LANGS: Lang[] = ["en", "vi", "th", "es"];

/** Đủ bài mới cho Google index — dưới ngưỡng thì noindex để tránh "trang mỏng" dìm
 *  cả site (Jane 21/8). Tự bật index khi 1 đội tích đủ bài, không cần sửa tay. */
const MIN_INDEX = 12;

export function generateStaticParams() {
  return LANGS.flatMap((lang) => TEAM_HUBS.map((t) => ({ lang, slug: t.slug })));
}

type Props = { params: Promise<{ lang: string; slug: string }> };

/** Nhãn theo ngôn ngữ trang — giữ trong file để khỏi phình interface i18n. */
const LABELS: Record<
  Lang,
  { home: string; about: (t: string) => string; sub: (t: string) => string; empty: string; allNews: string; otherTeams: string }
> = {
  vi: {
    home: "Trang chủ",
    about: (t) => `Tin & Nhận định ${t}`,
    sub: (t) => `Tin chuyển nhượng, nhận định trước trận và kết quả mới nhất của ${t}.`,
    empty: "Chưa có bài nào cho đội này.",
    allNews: "Tất cả tin",
    otherTeams: "Đội khác",
  },
  en: {
    home: "Home",
    about: (t) => `${t} — News & Analysis`,
    sub: (t) => `Latest ${t} transfer news, match previews and results.`,
    empty: "No articles yet for this team.",
    allNews: "All news",
    otherTeams: "Other teams",
  },
  th: {
    home: "หน้าแรก",
    about: (t) => `${t} — ข่าว & บทวิเคราะห์`,
    sub: (t) => `ข่าวย้ายทีม พรีวิว และผลการแข่งขันล่าสุดของ ${t}`,
    empty: "ยังไม่มีบทความสำหรับทีมนี้",
    allNews: "ข่าวทั้งหมด",
    otherTeams: "ทีมอื่น",
  },
  es: {
    home: "Inicio",
    about: (t) => `${t} — Noticias y Análisis`,
    sub: (t) => `Últimas noticias de fichajes, previas y resultados de ${t}.`,
    empty: "Aún no hay artículos para este equipo.",
    allNews: "Todas las noticias",
    otherTeams: "Otros equipos",
  },
};

function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const team = getTeamHub(slug);
  if (!team) return {};
  const L = LABELS[lang];
  // Noindex khi chưa đủ bài (tránh trang mỏng dìm site) — tự bật index khi đủ.
  const [news, analysis] = await Promise.all([getNewsByTeam(slug, MIN_INDEX), getAnalysisByTeam(slug, MIN_INDEX)]);
  const dense = news.length + analysis.length >= MIN_INDEX;
  return {
    title: `${L.about(team.name)} | banhbong.net`,
    description: L.sub(team.name),
    alternates: buildAlternates(`/doi/${slug}`, lang),
    robots: { index: dense, follow: true },
    openGraph: {
      title: `${L.about(team.name)} | banhbong.net`,
      description: L.sub(team.name),
      images: team.crest ? [{ url: team.crest }] : undefined,
    },
  };
}

type Row = { key: string; url: string; title: string; date: string | null; img: string | null };

export default async function TeamHub({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLang(rawLang);
  const team = getTeamHub(slug);
  if (!team) notFound();
  const L = LABELS[lang];

  const [news, analysis] = await Promise.all([getNewsByTeam(slug, 40), getAnalysisByTeam(slug, 40)]);
  const rows: Row[] = [
    ...news.map(
      (n: NewsItem): Row => ({
        key: `n-${n.id}`,
        url: withLang(`/news/${n.slug}`, lang),
        title: getHeadline(n, lang),
        date: n.published_at,
        img: n.hero_card_url,
      }),
    ),
    ...analysis.map(
      (a: AnalysisArticle): Row => ({
        key: `a-${a.slug}`,
        url: withLang(`/analysis/${a.slug}`, lang),
        title: a.title,
        date: a.published_at ?? null,
        img: a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}`,
      }),
    ),
  ].sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: L.home, url: withLang("/", lang) },
          { name: team.name, url: withLang(`/doi/${slug}`, lang) },
        ]}
      />
      <div className="mx-auto max-w-[1100px] px-5">
        <header className="flex items-center gap-4 py-8">
          {team.crest && (
            <img src={team.crest} alt="" width={64} height={64} className="h-16 w-16 shrink-0 object-contain" />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{L.about(team.name)}</h1>
            <p className="mt-1 text-sm text-muted">{L.sub(team.name)}</p>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="py-10 text-muted">{L.empty}</p>
        ) : (
          <div className="grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <Link
                key={r.key}
                href={r.url}
                prefetch={false}
                className="group overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-brand/30"
              >
                {r.img && <img src={r.img} alt="" width={1200} height={630} className="w-full" loading="lazy" />}
                <div className="p-4">
                  <time className="text-xs text-muted">{fmtDate(r.date, lang)}</time>
                  <p className="mt-1.5 line-clamp-2 font-display text-sm font-bold leading-snug transition-colors group-hover:text-brand">
                    {r.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <nav className="flex flex-wrap items-center gap-3 pb-14 text-xs">
          <Link
            href={withLang("/news", lang)}
            className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand"
          >
            {L.allNews} &rarr;
          </Link>
          <span className="text-muted">·</span>
          <span className="font-semibold text-muted">{L.otherTeams}:</span>
          {TEAM_HUBS.filter((t) => t.slug !== slug).map((t) => (
            <Link
              key={t.slug}
              href={withLang(`/doi/${t.slug}`, lang)}
              className="rounded-full border border-line px-3 py-1.5 font-semibold text-muted transition-colors hover:text-brand"
            >
              {t.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
