import type { Metadata } from "next";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getNewsItems, getHeadline, type NewsItem } from "@/lib/news";
import { getPosts } from "@/lib/data";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import type { AnalysisArticle, Post } from "@/lib/types";
import { getStandingsCompetitions } from "@/lib/standings-extra";
import { localizedCompetitionName } from "@/lib/competition-logos";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";

/* eslint-disable @next/next/no-img-element */

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveLeague(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: dict.news.title,
    description: dict.news.subtitle,
    openGraph: {
      title: `${dict.news.title} | WildlyPlay`,
      description: dict.news.subtitle,
      images: [{ url: "/api/og/editorial?title=News&subtitle=Match%20news%20and%20updates", width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/news", lang),
  };
}

/** Nhãn thời gian tương đối theo NGÔN NGỮ TRANG — "11h ago" trên trang tiếng
 *  Việt đọc như trang chưa dịch. Quá 7 ngày trả dd/mm cứng theo UTC để server
 *  và trình duyệt in cùng một chuỗi, khỏi lệch hydration. */
function timeLabel(iso: string, lang: Lang): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const REL: Record<Lang, { now: string; m: string; h: string; d: string }> = {
    en: { now: "just now", m: "{n}m ago", h: "{n}h ago", d: "{n}d ago" },
    vi: { now: "vừa xong", m: "{n} phút trước", h: "{n} giờ trước", d: "{n} ngày trước" },
    th: { now: "เมื่อสักครู่", m: "{n} นาทีที่แล้ว", h: "{n} ชม.ที่แล้ว", d: "{n} วันก่อน" },
    es: { now: "ahora mismo", m: "hace {n} min", h: "hace {n} h", d: "hace {n} días" },
  };
  const t = REL[lang];
  if (mins < 1) return t.now;
  if (mins < 60) return t.m.replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.h.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 7) return t.d.replace("{n}", String(days));
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Mọi nguồn tin quy về MỘT dạng thẻ — bản trước 3 kiểu thẻ 3 markup là lý do
 *  trang nhìn rối (Peter 8/8, tham chiếu bố cục espn.com/soccer). */
interface Card {
  key: string;
  href: string;
  title: string;
  thumb: string;
  badge: string;
  date: string;
}

export default async function NewsLanding({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const league = resolveLeague(sp.league);
  const dict = getDict(lang);
  const [items, posts, deskArticles, competitions] = await Promise.all([
    getNewsItems(league, 30),
    getPosts(lang),
    getAnalysisArticles(undefined, 30),
    getStandingsCompetitions(),
  ]);

  // Chip lọc: tên NGẮN đã dịch, MỘT hàng cuộn ngang — 11 tên tiếng Anh dài
  // vắt 3 hàng là thứ làm đầu trang rối nhất.
  const leagueFilters = competitions
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, label: localizedCompetitionName(c.slug, c.shortName || c.name, lang) }));
  const leagueLabels = Object.fromEntries(leagueFilters.map((f) => [f.id, f.label]));

  // Ba nguồn gộp một feed (Peter 8/8). Phân tích trận vẫn ở /analysis.
  // Lọc giải chỉ áp cho news_items (hai nguồn kia không có FK competition_id).
  const cards: Card[] = [
    ...items.map((item: NewsItem): Card => ({
      key: `i-${item.id}`,
      href: withLang(`/news/${item.slug}`, lang),
      title: getHeadline(item, lang),
      thumb: item.hero_card_url ?? `/api/og/editorial?title=${encodeURIComponent(getHeadline(item, lang))}`,
      badge: (item.competition_id && leagueLabels[item.competition_id]) || dict.nav.news,
      date: item.published_at,
    })),
    ...(league ? [] : posts.filter((p) => p.type === "news")).map((post: Post): Card => ({
      key: `p-${post.id}`,
      href: withLang(`/analysis/${post.slug}`, lang),
      title: post.title,
      thumb: `/api/og/news/${post.slug}`,
      badge: dict.nav.news,
      date: post.published_at ?? "",
    })),
    ...(league ? [] : deskArticles).map((a: AnalysisArticle): Card => ({
      key: `d-${a.id}`,
      href: withLang(`/analysis/${a.slug}`, lang),
      title: a.title,
      thumb: a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}`,
      badge: a.league,
      date: a.published_at,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25); // 1 nổi bật + 6 headline + 18 dòng — đủ một trang, không cuộn mỏi

  const noiBat = cards[0];
  const headline = cards.slice(1, 7);
  const conLai = cards.slice(7);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.news.title, url: "/news" }]} />

      <section className="py-10 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

      {/* Chip lọc giải: một hàng cuộn ngang, tên ngắn đã dịch */}
      <nav className="mb-8 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <Link
          href={withLang("/news", lang)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            !league
              ? "bg-brand text-white"
              : "border border-line bg-card text-muted hover:border-line-hover hover:text-foreground"
          }`}
        >
          {dict.analysis.tabs.all}
        </Link>
        {leagueFilters.map((f) => (
          <Link
            key={f.id}
            href={withLang(`/news?league=${f.id}`, lang)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              league === f.id
                ? "bg-brand text-white"
                : "border border-line bg-card text-muted hover:border-line-hover hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {cards.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.news.empty}
        </div>
      ) : (
        <>
          {/* Khối trên theo mẫu ESPN: bài nổi bật (ảnh to) + cột headline chữ.
              Thumbnail của mình là card có chữ sẵn — để cạnh tiêu đề là chữ
              hiện 2 lần (Jane soi), nên cột phải KHÔNG dùng ảnh. */}
          <div className="mb-8 grid gap-5 lg:grid-cols-3">
            <Link
              href={noiBat.href}
              className="group overflow-hidden rounded-card border border-line bg-card shadow-card transition-colors hover:border-brand/40 lg:col-span-2"
            >
              <img
                src={noiBat.thumb}
                alt=""
                width={1200}
                height={630}
                className="aspect-video w-full object-cover"
              />
              <div className="p-5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full border border-brand/40 bg-brand-dim px-2.5 py-0.5 font-display font-semibold text-brand">
                    {noiBat.badge}
                  </span>
                  <time dateTime={noiBat.date} className="text-muted">
                    {timeLabel(noiBat.date, lang)}
                  </time>
                </div>
                <h2 className="mt-2.5 font-display text-xl font-bold leading-snug transition-colors group-hover:text-brand sm:text-2xl">
                  {noiBat.title}
                </h2>
              </div>
            </Link>

            <div className="rounded-card border border-line bg-card shadow-card">
              <ul className="divide-y divide-line">
                {headline.map((c) => (
                  <li key={c.key}>
                    <Link href={c.href} className="group block px-5 py-3.5">
                      <span className="flex items-center gap-2 text-[11px] text-muted">
                        <span className="font-display font-semibold text-brand">{c.badge}</span>
                        <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
                        {c.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Danh sách còn lại: dòng gọn, thumbnail NHỎ (đọc như ảnh brand chứ
              không phải chữ lặp), tiêu đề tối đa 2 dòng, meta một dòng */}
          <div className="flex flex-col gap-3">
            {conLai.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className="group flex items-center gap-4 rounded-card border border-line bg-card p-3 shadow-card transition-colors hover:border-brand/40"
              >
                <img
                  src={c.thumb}
                  alt=""
                  width={1200}
                  height={630}
                  loading="lazy"
                  className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
                />
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="font-display font-semibold text-brand">{c.badge}</span>
                    <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
                  </span>
                  <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-brand sm:text-base">
                    {c.title}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
