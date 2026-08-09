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
import { teamBadge } from "@/lib/team-badges";

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

/** Bóc "A vs B" hoặc "A 2-1 B" từ tiêu đề tin trận. */
function bocTenDoi(title: string): [string, string] | null {
  const than = title.includes(":") ? title.slice(title.indexOf(":") + 1) : title;
  const gon = than.split("—")[0].split("–")[0].trim();
  let m = gon.match(/^(.{2,40}?)\s+vs\.?\s+(.{2,40})$/i);
  if (m) return [m[1].trim(), m[2].trim()];
  m = gon.match(/^(.{2,40}?)\s+\d+\s*-\s*\d+\s+(.{2,40})$/);
  if (m) return [m[1].trim(), m[2].trim()];
  return null;
}

function CrestOrInitial({ name }: { name: string }) {
  const badge = teamBadge(name);
  if (badge) {
    return <img src={badge} alt="" width={40} height={40} className="h-9 w-9 object-contain" />;
  }
  // CLB nhỏ ngoài kho 192 logo (vòng loại Cúp C1…) — vòng tròn 2 chữ cái đầu,
  // không rơi về card chữ xanh nữa (Peter 9/8: "như cứt, sửa liền").
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card font-display text-sm font-bold text-muted">
      {name.replace(/^(FC|AFC|CF|SK|FK)\s+/i, "").slice(0, 2).toUpperCase()}
    </span>
  );
}

function CrestThumb({ title, className }: { title: string; className: string }) {
  const doi = bocTenDoi(title);
  if (!doi) return null;
  return (
    <div className={`${className} flex items-center justify-center gap-3 bg-gradient-to-br from-brand-dim to-card`}>
      <CrestOrInitial name={doi[0]} />
      <span className="font-display text-[10px] font-bold text-muted">VS</span>
      <CrestOrInitial name={doi[1]} />
    </div>
  );
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
  /** Loại tin — badge màu để thẻ khác nhau khi lướt nhanh (review 9/8). */
  tag?: string;
  tagColor?: string;
  /** Phút đọc, chỉ bài dài (Desk/blog). */
  phutDoc?: number;
  /** Ảnh chụp thật (hero Wikimedia/storage) — khác card chữ tự render. */
  anhThat?: boolean;
}

/** "Trước trận: A vs B" → badge "Trước trận" + tựa "A vs B" — tiền tố trong
 *  tựa lặp với badge loại tin nên bóc ra, tựa gọn lại (review 9/8). */
function bocLoai(title: string): { loai: string | null; tua: string } {
  const m = title.match(/^([^:]{2,18}):\s+(.+)$/);
  return m ? { loai: m[1], tua: m[2] } : { loai: null, tua: title };
}

const MAU_LOAI: Record<string, string> = {
  preview: "border-blue-400/40 text-blue-400",
  result: "border-emerald-400/40 text-emerald-400",
  transfer: "border-indigo-soft/40 text-indigo-soft",
  standings: "border-amber-400/40 text-amber-400",
  general: "border-line text-muted",
};

function phutDoc(body: string | null | undefined): number | undefined {
  if (!body) return undefined;
  const tu = body.split(/\s+/).length;
  return tu > 150 ? Math.max(1, Math.round(tu / 200)) : undefined;
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
  // Bài Desk lưu league bằng TÊN tiếng Anh ("Premier League") — đổi sang nhãn
  // đã dịch cho khớp chip, không thì thẻ "Premier League" cạnh chip "Ngoại hạng Anh".
  const tenGiaiViet = new Map<string, string>();
  for (const c of competitions) {
    const nhan = localizedCompetitionName(c.slug, c.shortName || c.name, lang);
    tenGiaiViet.set(c.name, nhan);
    if (c.shortName) tenGiaiViet.set(c.shortName, nhan);
    // DB ghi "English Premier League" nhưng bài Desk ghi "Premier League" —
    // thêm biến thể bỏ tiền tố quốc gia, không thì map trượt (Jane soi còn 7 thẻ).
    tenGiaiViet.set(c.name.replace(/^(English|Spanish|Italian|German|French)\s+/, ""), nhan);
  }

  // Ba nguồn gộp một feed (Peter 8/8). Phân tích trận vẫn ở /analysis.
  // Lọc giải chỉ áp cho news_items (hai nguồn kia không có FK competition_id).
  const cards: Card[] = [
    ...items.map((item: NewsItem): Card => {
      const { loai, tua } = bocLoai(getHeadline(item, lang));
      return {
        key: `i-${item.id}`,
        href: withLang(`/news/${item.slug}`, lang),
        title: tua,
        thumb: item.hero_card_url ?? `/api/og/editorial?title=${encodeURIComponent(tua)}`,
        badge: (item.competition_id && leagueLabels[item.competition_id]) || dict.nav.news,
        date: item.published_at,
        tag: loai ?? undefined,
        tagColor: MAU_LOAI[item.type] ?? MAU_LOAI.general,
      };
    }),
    ...(league ? [] : posts.filter((p) => p.type === "news")).map((post: Post): Card => ({
      key: `p-${post.id}`,
      href: withLang(`/analysis/${post.slug}`, lang),
      title: post.title,
      thumb: `/api/og/news/${post.slug}`,
      badge: dict.nav.news,
      date: post.published_at ?? "",
      phutDoc: phutDoc(post.body_md),
    })),
    ...(league ? [] : deskArticles).map((a: AnalysisArticle): Card => ({
      key: `d-${a.id}`,
      href: withLang(`/analysis/${a.slug}`, lang),
      title: a.title,
      thumb: a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}`,
      badge: tenGiaiViet.get(a.league) ?? a.league,
      date: a.published_at,
      phutDoc: phutDoc(a.body),
      anhThat: !!a.hero_image,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 21); // 1 nổi bật + 6 headline + 14 dòng lưới 2 cột — Peter chê dài, cắt bớt

  const noiBat = cards[0];
  const headline = cards.slice(1, 7);
  const conLai = cards.slice(7);
  const anhNoiBat = !noiBat
    ? ""
    : noiBat.anhThat
      ? noiBat.thumb // ảnh thật (Wikimedia, credit nằm trong bài) — Peter chê card xanh 9/8
      : `/api/og/editorial?title=${encodeURIComponent(noiBat.badge)}&subtitle=WildlyPlay`;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.news.title, url: "/news" }]} />

      <section className="py-8 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

      {/* Chip lọc giải: một hàng cuộn ngang, tên ngắn đã dịch */}
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
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
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Link
              href={noiBat.href}
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition-colors hover:border-brand/40 lg:col-span-2"
            >
              {/* flex-1: cột headline bên phải cao hơn → ảnh giãn theo, không chừa
                  khoảng đen trống dưới tựa (soi screenshot desktop 9/8) */}
              <img
                src={anhNoiBat}
                alt=""
                width={1200}
                height={630}
                className="h-40 w-full object-cover sm:h-56 lg:h-auto lg:min-h-56 lg:flex-1"
              />
              <div className="p-4">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="rounded-full border border-brand/40 bg-brand-dim px-2.5 py-0.5 font-display font-semibold text-brand">
                    {noiBat.badge}
                  </span>
                  {noiBat.tag && (
                    <span className={`rounded-full border px-2 py-0.5 font-display font-semibold ${noiBat.tagColor}`}>
                      {noiBat.tag}
                    </span>
                  )}
                  <time dateTime={noiBat.date} className="text-muted">
                    {timeLabel(noiBat.date, lang)}
                  </time>
                  {noiBat.phutDoc && (
                    <span className="text-muted">
                      · {noiBat.phutDoc} {lang === "vi" ? "phút đọc" : lang === "th" ? "นาที" : lang === "es" ? "min" : "min read"}
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 font-display text-xl font-bold leading-snug transition-colors group-hover:text-brand sm:text-2xl">
                  {noiBat.title}
                </h2>
              </div>
            </Link>

            <div className="rounded-card border border-line bg-card shadow-card">
              <ul className="divide-y divide-line">
                {headline.map((c, i) => (
                  <li key={c.key}>
                    <Link href={c.href} className="group flex gap-3 px-4 py-3">
                      {/* Số thứ tự — cột trước đây 6 dòng giống hệt nhau, không có
                          mỏ neo để quét mắt (review 9/8) */}
                      <span className="font-display text-lg font-bold leading-6 text-brand/60 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[11px] text-muted">
                          <span className="font-display font-semibold text-brand">{c.badge}</span>
                          <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
                          {c.title}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Danh sách còn lại: dòng gọn, thumbnail NHỎ (đọc như ảnh brand chứ
              không phải chữ lặp), tiêu đề tối đa 2 dòng, meta một dòng */}
          <div className="grid gap-3 sm:grid-cols-2">
            {conLai.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className="group flex items-center gap-4 rounded-card border border-line bg-card p-3 shadow-card transition-colors hover:border-brand/40"
              >
                {c.anhThat ? (
                  <img
                    src={c.thumb}
                    alt=""
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
                  />
                ) : bocTenDoi(c.title) ? (
                  <CrestThumb title={c.title} className="hidden h-16 w-28 shrink-0 rounded-lg sm:flex" />
                ) : (
                  <img
                    src={c.thumb}
                    alt=""
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="font-display font-semibold text-brand">{c.badge}</span>
                    {c.tag && (
                      <span className={`rounded-full border px-1.5 py-px font-display font-semibold ${c.tagColor}`}>
                        {c.tag}
                      </span>
                    )}
                    <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
                    {c.phutDoc && (
                      <span>· {c.phutDoc} {lang === "vi" ? "phút đọc" : lang === "th" ? "นาที" : lang === "es" ? "min" : "min read"}</span>
                    )}
                  </span>
                  <h2 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand sm:text-[17px]">
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
