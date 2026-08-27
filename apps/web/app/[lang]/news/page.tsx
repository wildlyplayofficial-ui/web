import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getNewsItems, getHeadline, type NewsItem } from "@/lib/news";
import { getPosts } from "@/lib/data";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import type { AnalysisArticle, Post } from "@/lib/types";
import { fetchCompetitionTable } from "@/lib/standings";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { localizedCompetitionName } from "@/lib/competition-logos";
import { teamBadge } from "@/lib/team-badges";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { HomeNextMatches, type StripMatch } from "@/components/home-next-matches";
import { ScrollRow } from "@/components/scroll-row";
import { TeamCrest } from "@/components/team-crest";
import { LocalKickoffTime } from "@/components/local-kickoff-time";

/* eslint-disable @next/next/no-img-element */

export const revalidate = 300;

const EPL_LIVESCORE_ID = 2;

/** Bao nhiêu thẻ nằm TRÊN danh sách (1 nổi bật + 6 headline + 6 lưới) và mỗi lần
 *  "xem thêm" nối thêm bao nhiêu. Trần để một trang sâu không kéo cả kho về. */
const TRUOC_LIST = 13;
const PAGE_SIZE = 10;
const TRAN_LAY = 200;

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
      title: `${dict.news.title} | banhbong.net`,
      description: dict.news.subtitle,
      images: [{ url: `/api/og/editorial?title=News&subtitle=Match%20news%20and%20updates&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    alternates: buildAlternates("/news", lang),
  };
}

/** Nhãn thời gian tương đối theo NGÔN NGỮ TRANG. Quá 7 ngày trả dd/mm theo UTC
 *  để server và trình duyệt in cùng một chuỗi, khỏi lệch hydration. */
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

/** "Trước trận: A vs B" → badge loại + tựa gọn — tiền tố lặp với badge nên bóc ra. */
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

/** Cắt tóm tắt ~150 ký tự tại ranh giới TỪ — thứ lấp trống nhiều nhất so với
 *  vnexpress (Peter duyệt bố cục 9/8). Bỏ markdown để không lòi ###, [link]. */
function tomTat(body: string | null | undefined): string | undefined {
  if (!body) return undefined;
  const sach = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (sach.length < 60) return undefined;
  const cat = sach.slice(0, 150);
  return cat.slice(0, cat.lastIndexOf(" ")) + "…";
}

function getBody(item: NewsItem, lang: Lang): string | null {
  const key = `body_${lang}` as keyof NewsItem;
  return (item[key] as string | null) || item.body_en;
}

interface Card {
  key: string;
  href: string;
  title: string;
  thumb: string;
  badge: string;
  date: string;
  tag?: string;
  tagColor?: string;
  phutDoc?: number;
  /** Ảnh chụp thật (hero Wikimedia/storage) — khác card chữ tự render. */
  anhThat?: boolean;
  moTa?: string;
}

function CrestOrInitial({ name }: { name: string }) {
  const badge = teamBadge(name);
  if (badge) {
    return <img src={badge} alt="" width={40} height={40} className="h-9 w-9 object-contain" />;
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card font-display text-sm font-bold text-muted">
      {name.replace(/^(FC|AFC|CF|SK|FK)\s+/i, "").slice(0, 2).toUpperCase()}
    </span>
  );
}

function bocTenDoi(title: string): [string, string] | null {
  const than = title.includes(":") ? title.slice(title.indexOf(":") + 1) : title;
  const gon = than.split("—")[0].split("–")[0].trim();
  let m = gon.match(/^(.{2,40}?)\s+vs\.?\s+(.{2,40})$/i);
  if (m) return [m[1].trim(), m[2].trim()];
  m = gon.match(/^(.{2,40}?)\s+\d+\s*-\s*\d+\s+(.{2,40})$/);
  if (m) return [m[1].trim(), m[2].trim()];
  return null;
}

function CrestThumb({ title, className, big = false }: { title: string; className: string; big?: boolean }) {
  const doi = bocTenDoi(title);
  if (!doi) return null;
  if (!big) {
    return (
      <div className={`${className} flex items-center justify-center gap-3 bg-gradient-to-br from-brand-dim to-card`}>
        <CrestOrInitial name={doi[0]} />
        <span className="font-display text-[10px] font-bold text-muted">VS</span>
        <CrestOrInitial name={doi[1]} />
      </div>
    );
  }
  // Bản to cho lưới: logo lớn + tên đội — thumb chỉ 2 logo nhỏ giữa nền trống
  // là một trong các "chỗ còn trống" Peter chỉ 9/8.
  return (
    <div className={`${className} flex items-center justify-center gap-5 bg-gradient-to-br from-brand-dim to-card px-4`}>
      <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
        <CrestOrInitial name={doi[0]} />
        <span className="line-clamp-1 text-[11px] font-semibold text-muted">{doi[0]}</span>
      </span>{" "}
      <span className="font-display text-xs font-bold text-muted">VS</span>{" "}
      <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
        <CrestOrInitial name={doi[1]} />
        <span className="line-clamp-1 text-[11px] font-semibold text-muted">{doi[1]}</span>
      </span>
    </div>
  );
}

/** Ảnh thẻ dùng chung: ảnh thật > crest 2 đội > card OG. */
function CardThumb({ c, className, big = false }: { c: Card; className: string; big?: boolean }) {
  if (c.anhThat) {
    return <img src={c.thumb} alt="" width={1200} height={630} loading="lazy" className={`${className} object-cover`} />;
  }
  if (bocTenDoi(c.title)) {
    return <CrestThumb title={c.title} className={className} big={big} />;
  }
  return <img src={c.thumb} alt="" width={1200} height={630} loading="lazy" className={`${className} object-cover`} />;
}

function MetaRow({ c, lang }: { c: Card; lang: Lang }) {
  return (
    <span className="flex items-center gap-2 text-[11px] text-muted">
      <span className="font-display font-semibold text-brand">{c.badge}</span>
      {c.tag && (
        <span className={`rounded-full border px-1.5 py-px font-display font-semibold ${c.tagColor}`}>{c.tag}</span>
      )}
      <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
      {c.phutDoc && (
        <span>
          · {c.phutDoc} {lang === "vi" ? "phút đọc" : lang === "th" ? "นาที" : lang === "es" ? "min" : "min read"}
        </span>
      )}
    </span>
  );
}

export default async function NewsLanding({ params, searchParams }: Props) {
  const lang = resolveLang((await params).lang);
  const sp = await searchParams;
  const league = resolveLeague(sp.league);
  const page = Math.max(1, Number(sp.page) || 1);
  const dict = getDict(lang);
  // Lấy BAO NHIÊU thì phải theo TRANG đang xem. Trước đây chặn cứng 30 cho cả hai
  // nguồn, nên lật tới trang nào danh sách cũng chỉ có bấy nhiêu bài tin — 91 trên
  // 121 bài tin không bao giờ hiện ra, thành bài mồ côi mà Google không có đường bò
  // tới (đo 27/8/2026: trang 5, 13, 20, 99 đều trả đúng 30 bài tin).
  // Sàn 30 để TRANG 1 giữ nguyên như trước bản vá: chip lọc giải sinh ra từ danh
  // sách này, lấy ít hơn 30 là có giải biến mất khỏi thanh chip.
  const canLay = Math.min(TRAN_LAY, Math.max(30, TRUOC_LIST + page * PAGE_SIZE));
  const [items, posts, deskArticles, competitions, eplTable, eplDays] = await Promise.all([
    getNewsItems(league, canLay),
    getPosts(lang),
    getAnalysisArticles(undefined, canLay),
    // Ba lượt gọi nhà cung cấp NGOÀI — hứng lỗi để hạn chờ 6 giây không hạ cả
    // trang. Cùng lý do với trang chủ, xem chú thích trong ls-fetch.ts.
    getStandingsCompetitions().catch(() => []),
    fetchCompetitionTable(EPL_LIVESCORE_ID).catch(() => []),
    getCompetitionFixtures(EPL_LIVESCORE_ID).catch(() => []),
  ]);

  // Chip chỉ hiện giải THẬT SỰ có tin (Peter 9/8: "các giải khác chưa có" —
  // bấm chip ra trang trống là tệ nhất). NHA luôn hiện vì có bài Desk.
  // KÊU TO khi chạm trần. Trần chỉ dời bức tường từ 30 ra 200 chứ không gỡ nó —
  // vượt 200 là lỗi cũ quay lại y hệt: trang sau đứng yên, không báo gì. Với nhịp
  // 2-3 bài/ngày thì cỡ 8 tháng nữa chạm, lúc đó không ai còn nhớ có cái trần này.
  // Jane chỉ ra 27/8. Nhà mình có luật: chỗ nào có đường lui thì phải kêu khi dùng tới.
  if (canLay >= TRAN_LAY && items.length >= TRAN_LAY) {
    console.warn(
      `[news] CHẠM TRẦN ${TRAN_LAY} bài ở trang ${page} — bài cũ hơn không hiện ra ` +
      `và không có link nội bộ nào trỏ tới. Đổi sang lấy đúng lát cắt theo trang.`,
    );
  }

  const giaiCoTin = new Set(items.map((i) => i.competition_id).filter(Boolean));
  // Bài Desk mang league bằng TÊN — mở chip cho cả giải có bài Desk (9 bài
  // La Liga/Ligue 1 đăng 9/8 mà chip không mở là bài không có lối lọc).
  const giaiDesk = new Set(deskArticles.map((a) => a.league));
  const coDesk = (c: { name: string; shortName: string }) =>
    giaiDesk.has(c.name) ||
    (c.shortName && giaiDesk.has(c.shortName)) ||
    giaiDesk.has(c.name.replace(/^(English|Spanish|Italian|German|French)\s+/, ""));
  const leagueFilters = competitions
    .filter((c) => c.status === "active")
    .filter((c) => giaiCoTin.has(c.id) || coDesk(c) || c.slug === "premier-league")
    .map((c) => ({ id: c.id, label: localizedCompetitionName(c.slug, c.shortName || c.name, lang) }));
  const leagueLabels = Object.fromEntries(
    competitions.map((c) => [c.id, localizedCompetitionName(c.slug, c.shortName || c.name, lang)]),
  );
  const tenGiaiViet = new Map<string, string>();
  for (const c of competitions) {
    const nhan = localizedCompetitionName(c.slug, c.shortName || c.name, lang);
    tenGiaiViet.set(c.name, nhan);
    if (c.shortName) tenGiaiViet.set(c.shortName, nhan);
    tenGiaiViet.set(c.name.replace(/^(English|Spanish|Italian|German|French)\s+/, ""), nhan);
  }

  // ── Tầng 1: dải trận (tái dùng component + logic trang chủ) ──
  const active = competitions.filter((c) => c.status === "active" && c.slug);
  const perComp = await Promise.all(
    active.map(async (c) => {
      const days = await getCompetitionFixtures(c.livescoreId).catch(() => []);
      return days.flatMap((d) =>
        d.matches.map(
          (m): StripMatch => ({
            ...m,
            compSlug: c.slug,
            compName: localizedCompetitionName(c.slug, c.shortName || c.name, lang),
          }),
        ),
      );
    }),
  );
  const allMatches = perComp.flat();
  const todayKey = new Date().toISOString().slice(0, 10);
  const key = (m: StripMatch) => `${m.date}T${m.time || "00:00"}`;
  const vuaDa = allMatches
    .filter((m) => m.finished && m.date <= todayKey)
    .sort((a, b) => key(b).localeCompare(key(a)))
    .slice(0, 3)
    .reverse();
  const chuaDa = allMatches
    .filter((x) => !x.finished && x.date >= todayKey)
    .sort((a, b) => key(a).localeCompare(key(b)));
  const uuTien = chuaDa.filter((m) => m.compSlug === "premier-league").slice(0, 3);
  const demTheoGiai = new Map<string, number>([["premier-league", uuTien.length]]);
  const sapDaStrip: StripMatch[] = [...uuTien];
  for (const m of chuaDa) {
    const da = demTheoGiai.get(m.compSlug) ?? 0;
    if (da >= 2) continue;
    demTheoGiai.set(m.compSlug, da + 1);
    sapDaStrip.push(m);
    if (sapDaStrip.length >= 8) break;
  }
  const stripMatches = [...vuaDa, ...sapDaStrip];

  // ── Gộp 3 nguồn tin về một dạng Card ──
  const cards: Card[] = [
    ...items.map((item: NewsItem): Card => {
      const { loai, tua: tuaTho } = bocLoai(getHeadline(item, lang));
      // Bỏ đuôi "— Major League Soccer": badge đã ghi giải, lặp trong tựa vừa dài
      // vừa gây "éo hiểu tin đó là gì" (Peter 9/8)
      const tua = tuaTho.replace(/\s+[—–]\s+[^—–]{3,40}$/, "");
      return {
        key: `i-${item.id}`,
        href: withLang(`/news/${item.slug}`, lang),
        title: tua,
        thumb: item.hero_card_url ?? `/api/og/editorial?title=${encodeURIComponent(tua)}&v=${OG_VERSION}`,
        // Featured slot uses thumb only when anhThat is set. Without this, a news
        // item with a real hero (e.g. the Romero transfer card) fell back to the
        // generic league OG image in the "nổi bật" slot (Jane 15/8).
        anhThat: !!item.hero_card_url,
        badge: (item.competition_id && leagueLabels[item.competition_id]) || dict.nav.news,
        date: item.published_at,
        tag: loai ?? undefined,
        tagColor: MAU_LOAI[item.type] ?? MAU_LOAI.general,
        // KHÔNG tóm tắt tin tự sinh: body là câu template giống hệt nhau
        // ("Theo dõi tỷ số trực tiếp…" ×14) — đọc như robot.
      };
    }),
    ...(league ? [] : posts.filter((p) => p.type === "news")).map((post: Post): Card => ({
      key: `p-${post.id}`,
      href: withLang(`/analysis/${post.slug}`, lang),
      title: post.title,
      thumb: `/api/og/news/${post.slug}?locale=${lang}&v=${OG_VERSION}`,
      badge: dict.nav.news,
      date: post.published_at ?? "",
      phutDoc: phutDoc(post.body_md),
      moTa: tomTat(post.body_md),
    })),
    ...(league
      ? deskArticles.filter((a) => {
          const c = competitions.find((x) => x.id === league);
          return !!c && (a.league === c.name || a.league === c.shortName ||
            a.league === c.name.replace(/^(English|Spanish|Italian|German|French)\s+/, ""));
        })
      : deskArticles
    ).map((a: AnalysisArticle): Card => ({
      key: `d-${a.id}`,
      href: withLang(`/analysis/${a.slug}`, lang),
      title: a.title,
      thumb: a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}&v=${OG_VERSION}`,
      badge: tenGiaiViet.get(a.league) ?? a.league,
      date: a.published_at,
      phutDoc: phutDoc(a.body),
      anhThat: !!a.hero_image,
      moTa: tomTat(a.body),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // ── Chia tầng: 1 nổi bật + 5 headline có ảnh + 6 lưới + list có tóm tắt ──
  const noiBat = cards[0];
  const headline = cards.slice(1, 7);
  const luoi = cards.slice(7, 13);
  const listAll = cards.slice(TRUOC_LIST);
  const list = listAll.slice(0, page * PAGE_SIZE);
  const conNua = listAll.length > list.length;

  // Sidebar: BXH top 5 + 3 trận NHA sắp đá
  const top5 = eplTable.slice(0, 5);
  const eplSapDa = eplDays
    .filter((d) => d.date >= todayKey)
    .flatMap((d) => d.matches)
    .filter((m) => !m.finished)
    .slice(0, 3);

  const anhNoiBat = !noiBat
    ? ""
    : noiBat.anhThat
      ? noiBat.thumb
      : `/api/og/editorial?title=${encodeURIComponent(noiBat.badge)}&subtitle=banhbong.net&v=${OG_VERSION}`;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-12">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: dict.news.title, url: "/news" }]} />

      <section className="py-8 text-center">
        <h1 className="gradient-text font-display text-4xl font-bold">{dict.news.title}</h1>
        <p className="mt-3 text-muted">{dict.news.subtitle}</p>
      </section>

      {/* 1. Dải trận: lịch + tỷ số — khối dữ liệu sống lấp đầu trang (mẫu vnexpress) */}
      <HomeNextMatches
        matches={stripMatches}
        lang={lang}
        labels={{
          title: dict.home.matchesTitle,
          all: dict.home.allCompetitions,
          finished: dict.home.finished,
          noTime: dict.standings.provisionalTime,
        }}
      />

      {/* 2. Chip lọc giải */}
      <ScrollRow className="mb-6 flex gap-2 pb-1">
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
      </ScrollRow>

      {cards.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-6 py-16 text-center text-muted">
          {dict.news.empty}
        </div>
      ) : (
        <>
          {/* 3. Hero: 1 bài to + headline có ảnh. Mỗi section có TIÊU ĐỀ —
              Peter 9/8: "các section chưa có header, éo hiểu tin đó là gì". */}
          <h2 className="mb-3 border-l-4 border-brand pl-3 font-display text-lg font-bold">
            {dict.news.featuredTitle}
          </h2>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Link
              href={noiBat.href}
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card transition-colors hover:border-brand/40 lg:col-span-2"
            >
              {/* Khung giữ ĐÚNG tỷ lệ ảnh hero (1200x630) nên object-cover không
                  còn gì để cắt.

                  Trước đây khung để chiều cao cố định: ảnh 2400x1260 (tỷ lệ 1.905)
                  nhét vào khung 1.725 trên máy tính bị cắt ~9% bề ngang, khung
                  3.473 trên máy tính bảng bị cắt ~45% chiều cao (Gwen đo 25/8).
                  Ảnh hero vẽ sát mép — tên cầu thủ ở lề trái, chữ banhbong.net ở
                  góc phải — nên cắt bên nào cũng mất chữ. Nick bắt được: "banhbong.net"
                  cụt thành "banhbong.n".

                  Vẫn giữ div relative + img absolute như cũ để ảnh DỌC (cúp MLS)
                  không kéo dài thẻ (Jane đo 9/8). */}
              <div className="relative aspect-[1200/630] overflow-hidden">
                <img
                  src={anhNoiBat}
                  alt=""
                  width={1200}
                  height={630}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <MetaRow c={noiBat} lang={lang} />
                <h2 className="mt-2 font-display text-xl font-bold leading-snug transition-colors group-hover:text-brand sm:text-2xl">
                  {noiBat.title}
                </h2>
                {noiBat.moTa && <p className="mt-2 line-clamp-2 text-sm text-muted">{noiBat.moTa}</p>}
              </div>
            </Link>

            <div className="flex flex-col rounded-card border border-line bg-card shadow-card">
              <ul className="flex-1 divide-y divide-line">
                {headline.map((c) => (
                  <li key={c.key}>
                    <Link href={c.href} className="group flex items-center gap-3 px-4 py-3">
                      <CardThumb c={c} className="h-12 w-20 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[11px] text-muted">
                          <span className="font-display font-semibold text-brand">{c.badge}</span>
                          <time dateTime={c.date}>{timeLabel(c.date, lang)}</time>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-snug transition-colors group-hover:text-brand">
                          {c.title}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {/* Footer ghim đáy — thẻ bị grid stretch, không có footer là hở khoảng trống */}
              <Link
                href={withLang("/news?page=2", lang)}
                className="border-t border-line px-4 py-2.5 text-center font-display text-xs font-semibold text-brand hover:underline"
              >
                {dict.news.loadMore} →
              </Link>
            </div>
          </div>

          {/* 4. Lưới 3 cột — ảnh trên, tựa dưới (Jane: 3 cột dễ đọc mobile hơn 4) */}
          {luoi.length > 0 && (
            <>
            <h2 className="mb-3 border-l-4 border-brand pl-3 font-display text-lg font-bold">
              {dict.news.latestTitle}
            </h2>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {luoi.map((c) => (
                <Link
                  key={c.key}
                  href={c.href}
                  className="group overflow-hidden rounded-card border border-line bg-card shadow-card transition-colors hover:border-brand/40"
                >
                  {/* Tỷ lệ đúng bằng ảnh hero (1200x630). aspect-video là 16/9 = 1.778,
                      lệch với ảnh 1.905 nên cắt ~7% bề ngang — cùng kiểu lỗi
                      nuốt chữ "banhbong.net" mà Nick bắt ở thẻ Tin nổi bật. */}
                  <CardThumb c={c} className="aspect-[1200/630] w-full" big />
                  <div className="p-3.5">
                    <MetaRow c={c} lang={lang} />
                    <h2 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
                      {c.title}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>
            </>
          )}

          {/* 5. Hai cột: list có TÓM TẮT + sidebar BXH/lịch/CTA.
              Tiêu đề chỉ hiện khi CÓ bài — giải ít hơn 13 bài (EPL, Serie A…)
              thì list rỗng, trước đây tiêu đề vẫn hiện trên khoảng trống (Jane 15/8). */}
          {list.length > 0 && (
            <h2 className="mb-3 border-l-4 border-brand pl-3 font-display text-lg font-bold">
              {dict.news.allTitle}
            </h2>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-3 lg:col-span-2">
              {list.map((c) => (
                <Link
                  key={c.key}
                  href={c.href}
                  className="group flex items-start gap-4 rounded-card border border-line bg-card p-3 shadow-card transition-colors hover:border-brand/40"
                >
                  <CardThumb c={c} className="hidden h-16 w-28 shrink-0 rounded-lg sm:flex" />
                  <div className="min-w-0 flex-1">
                    <MetaRow c={c} lang={lang} />
                    <h2 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand sm:text-[16px]">
                      {c.title}
                    </h2>
                    {c.moTa && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.moTa}</p>}
                  </div>
                </Link>
              ))}

              {/* 8. Xem thêm — giữ query giải đang lọc */}
              {conNua && (
                <Link
                  href={withLang(`/news?${league ? `league=${league}&` : ""}page=${page + 1}`, lang)}
                  className="mt-2 rounded-full border border-line bg-card px-6 py-2.5 text-center font-display text-sm font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {dict.news.loadMore} ↓
                </Link>
              )}
            </div>

            <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
              {/* Mini BXH NHA top 5 */}
              {top5.length > 0 && (
                <div className="rounded-card border border-line bg-card shadow-card">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="font-display text-sm font-bold">{dict.news.standingsTitle}</h3>
                    <Link href={withLang("/competitions/premier-league", lang)} className="text-xs font-semibold text-brand hover:underline">
                      {dict.nav.standings} →
                    </Link>
                  </div>
                  <ul className="divide-y divide-line">
                    {top5.map((t) => (
                      <li key={t.rank} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                        <span className="w-4 text-right font-display font-bold text-muted tabular-nums">{t.rank}</span>
                        <TeamCrest name={t.name} />
                        <span className="min-w-0 flex-1 truncate">{t.name}</span>
                        <span className="font-display font-bold tabular-nums">{t.points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lịch NHA sắp đá */}
              {eplSapDa.length > 0 && (
                <div className="rounded-card border border-line bg-card shadow-card">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="font-display text-sm font-bold">{dict.news.upcomingTitle}</h3>
                    <Link
                      href={withLang("/competitions/premier-league/fixtures", lang)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      {dict.standings.schedule} →
                    </Link>
                  </div>
                  <ul className="divide-y divide-line">
                    {eplSapDa.map((m) => (
                      <li key={m.id} className="px-4 py-2.5 text-sm">
                        {m.time && !m.provisional ? (
                          <LocalKickoffTime iso={`${m.date}T${m.time}:00Z`} showDate className="text-[11px] text-muted" />
                        ) : (
                          <span className="text-[11px] text-muted">{dict.standings.provisionalTime}</span>
                        )}
                        <div className="mt-1 flex items-center gap-1.5">
                          <TeamCrest name={m.homeName} />
                          <span className="truncate">{m.homeName}</span>{" "}
                          <span className="text-muted">–</span>{" "}
                          <TeamCrest name={m.awayName} />
                          <span className="truncate">{m.awayName}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 7. Cross-link sang Phân Tích + Dự Đoán — promo tĩnh, không trộn list */}
              <Link
                href={withLang("/analysis", lang)}
                className="group rounded-card border border-brand/30 bg-brand-dim/40 p-4 transition-colors hover:border-brand/60"
              >
                <h3 className="font-display text-sm font-bold text-brand">{dict.news.fromAnalysis}</h3>
                <p className="mt-1.5 text-sm text-muted">{dict.news.fromAnalysisBody}</p>
                <span className="mt-2 inline-block font-display text-sm font-semibold text-brand group-hover:underline">
                  {dict.nav.analysis} →
                </span>
              </Link>
              <Link
                href={withLang("/daily-board", lang)}
                className="group rounded-card bg-brand p-4 transition-transform hover:-translate-y-0.5"
              >
                <h3 className="font-display text-sm font-bold text-bg">{dict.board.title}</h3>
                <span className="mt-1.5 inline-block font-display text-sm font-semibold text-bg/90 group-hover:underline">
                  {dict.home.viewBoard} →
                </span>
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
