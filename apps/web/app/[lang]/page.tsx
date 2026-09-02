import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import {
  getActiveWatching,
  getSettledPicks,
  getTodaysNoPlays,
  getRecentRecapPosts,
  getThesisTranslations,
  getTodaysPicks,
  getTrackRecordForAuthor,
} from "@/lib/data";
import { formatBoardDate, formatUnits, locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { localizedCompetitionName } from "@/lib/competition-logos";
import { HomeNextMatches, type StripMatch } from "@/components/home-next-matches";
import { ScoreboardRail } from "@/components/scoreboard-rail";
import { HotPickCard } from "@/components/hot-pick-card";
import { getAnalysisArticles } from "@/lib/analysis-articles";
import { AnalysisCard, analysisExcerpt } from "@/components/analysis-card";
import { getNewsItems, getHeadline, getBody } from "@/lib/news";
import { getOddsBoard } from "@/lib/odds-data";

export const revalidate = 300;

/** Ngoại hạng Anh trên Livescore — giải duy nhất có lịch tĩnh cả mùa. */
const EPL_LIVESCORE_ID = 2;

/** Units P/L over the 30 days before now (form widget, batch 4). */
function unitsLast30(picks: { settled_at: string | null; kickoff_utc: string; units_pl: number | null }[]): number {
  const cutoff = Date.now() - 30 * 86_400_000;
  const sum = picks
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff)
    .reduce((total, p) => total + (p.units_pl ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

function formatPostDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locales[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  return {
    title: { absolute: `banhbong.net — ${dict.tagline}` },
    description: dict.home.seoDescription,
    alternates: buildAlternates("/", lang),
    openGraph: {
      title: `banhbong.net — ${dict.tagline}`,
      description: dict.home.seoDescription,
      images: [{ url: `/api/og/home?lang=${lang}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `banhbong.net — ${dict.tagline}`,
      description: dict.home.seoDescription,
      images: [{ url: `/api/og/home?lang=${lang}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Home({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [allPicks, record, settledPicks, noPlays, watching, eplDays, competitions, articles, newsItems, oddsMatches, recapPosts] =
    await Promise.all([
      getTodaysPicks(),
      getTrackRecordForAuthor("curator"),
      getSettledPicks(),
      getTodaysNoPlays(),
      getActiveWatching(),
      // Hai lượt này gọi nhà cung cấp NGOÀI. Từ 27/8 lsFetch có hạn chờ 6 giây,
      // nên quá hạn nó NÉM LỖI thay vì treo. Không hứng ở đây thì cả trang chủ
      // 500 — đổi một kiểu hỏng lấy một kiểu hỏng khác. Hứng rồi thì mất dải
      // trận, phần còn lại của trang vẫn lên.
      getCompetitionFixtures(EPL_LIVESCORE_ID).catch(() => []),
      getStandingsCompetitions().catch(() => []),
      getAnalysisArticles(undefined, 12),
      getNewsItems(undefined, 6),
      getOddsBoard(),
      getRecentRecapPosts(lang, 2),
    ]);

  const todayKey = new Date().toISOString().slice(0, 10);

  // Dải trận trang chủ gộp MỌI giải, không riêng Ngoại hạng Anh (Peter 8/8).
  // Lấy trận vừa đá xong (có tỉ số) rồi tới trận sắp đá — tháng 8 Ngoại hạng Anh
  // chưa lăn bóng nhưng MLS/Liga MX đang đá, trang chủ phải có cái để xem.
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
  const key = (m: StripMatch) => `${m.date}T${m.time || "00:00"}`;
  const vuaDa = allMatches
    .filter((m) => m.finished && m.date <= todayKey)
    .sort((a, b) => key(b).localeCompare(key(a)))
    .slice(0, 3)
    .reverse();
  // Ngoại hạng Anh luôn đứng trước (Peter 8/8) — đây là giải mình đặt nặng nhất.
  // Còn lại xếp theo giờ, tối đa 2 trận mỗi giải: xếp thuần theo giờ thì vòng
  // loại Cúp C1 chiếm gần hết dải, vẫn là "một giải" y như cũ chỉ khác tên.
  const chuaDa = allMatches
    .filter((x) => !x.finished && x.date >= todayKey)
    .sort((a, b) => key(a).localeCompare(key(b)));
  const uuTien = chuaDa.filter((m) => m.compSlug === "premier-league").slice(0, 3);
  const demTheoGiai = new Map<string, number>([["premier-league", uuTien.length]]);
  const sapDa: StripMatch[] = [...uuTien];
  for (const m of chuaDa) {
    const da = demTheoGiai.get(m.compSlug) ?? 0;
    if (da >= 2) continue;
    demTheoGiai.set(m.compSlug, da + 1);
    sapDa.push(m);
    if (sapDa.length >= 8) break;
  }
  const stripMatches = [...vuaDa, ...sapDa];

  const eplOpenDate = eplDays.length ? eplDays[0].date : null;
  const daysToOpen =
    eplOpenDate && eplOpenDate > todayKey
      ? Math.ceil((Date.parse(eplOpenDate + "T00:00:00Z") - Date.parse(todayKey + "T00:00:00Z")) / 86_400_000)
      : null;
  // §7.1: Home hero numbers are curator-only (never blend Scout results)
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  // Nick 29/8: băng "Bảng Dự Đoán Hôm Nay" phải NHÂN ĐÔI — một băng của Chú Tám Banh,
  // một băng của Trợ lý AI, mỗi bên màu riêng. Trước chỉ có một băng đếm kèo Chú Tám
  // Banh nên hôm có kèo AI mà băng vẫn ghi "Nhận định chọn: 0" — Nick bắt được.
  const scoutPicks = allPicks.filter((p) => p.author === "scout");
  // Băng Chú Tám Banh LUÔN đứng trước, kể cả hôm bác nghỉ — hỏi Nick 29/8 có cho
  // băng AI nhảy lên trên không, anh trả lời "Không nhảy lên trên".
  // Bác nghỉ thì chỉ ĐỔI TIÊU ĐỀ băng AI thành "Kèo Hôm Nay", không đổi thứ tự.
  const bacNghi = picks.length === 0;
  // Màu lấy đúng màu đã dùng cho hai nhân vật ở mọi trang khác — xanh thương hiệu
  // cho Chú Tám Banh, #6b9e9e cho Trợ lý AI (giống /about, /archive, /track-record,
  // khối AI dưới trang Bảng). KHÔNG chế màu mới.
  const bangBac = {
    href: withLang("/daily-board", lang),
    ten: dict.pick.curator,
    cham: "bg-brand",
    so: [
      { nhan: dict.board.picksLabel, gia: picks.length },
      { nhan: dict.board.noPlaysLabel, gia: noPlays.length },
      { nhan: dict.board.watchingLabel, gia: watching.length },
    ],
    ghiChu: null as string | null,
  };
  // Băng AI chỉ đếm kèo của nó. Bỏ qua và Đang theo dõi là sổ của Chú Tám Banh,
  // in lại bên này là đếm trùng.
  // Hôm không có kèo AI thì băng VẪN HIỆN, chỉ đổi phần số thành câu "không có kèo
  // phụ hôm nay" — giống khối AI dưới /daily-board. Trước đây ẩn hẳn băng, hoá ra
  // Nick nhìn thấy một băng lại tưởng mã chưa lên (sáng 30/8); Nick chốt cho hiện.
  const coKeoAI = scoutPicks.length > 0;
  const bangAI = {
    href: `${withLang("/daily-board", lang)}#tro-ly-ai`,
    ten: dict.scout.name,
    cham: "bg-[#6b9e9e]",
    so: coKeoAI ? [{ nhan: dict.board.picksLabel, gia: scoutPicks.length }] : [],
    // Tên "Trợ lý AI" đã in ngay bên trái trong băng gộp → dùng bản không kèm tên.
    ghiChu: coKeoAI ? null : dict.scout.noPlayShort,
  };

  // Predictions slot — the top curator pick, or nothing. NEVER a fabricated seed:
  // no real pick = the card is omitted below (the old test-seed rendered a fake match).
  const heroPick = picks[0] ?? null;
  // Bản dịch nhận định nằm ở bảng pick_content; cột `thesis` trên pick luôn là
  // tiếng Anh. Không lấy bản dịch thì trang tiếng Việt hiện ruột tiếng Anh (Nick 23/8).
  const heroThesis = heroPick
    ? (await getThesisTranslations([heroPick.id]))[heroPick.id]?.[lang] ?? heroPick.thesis
    : null;

  // Form widget (Nick 13/6: show all within last 30 days, swipeable, scroll to newest).
  const curatorSettled = settledPicks.filter((p) => (p.author ?? "curator") === "curator");
  const cutoff30 = Date.now() - 30 * 86_400_000;
  const form = curatorSettled
    .filter((p) => new Date(p.settled_at ?? p.kickoff_utc).getTime() >= cutoff30)
    .reverse()
    .slice(-15);
  const units30 = unitsLast30(curatorSettled);
  const formLetter: Record<string, string> = { won: "W", lost: "L", push: "P" };
  const formClass: Record<string, string> = {
    won: "border-brand/30 bg-brand-dim text-brand",
    lost: "border-loss/30 bg-loss/10 text-loss",
    push: "border-line bg-card text-muted",
  };

  // Mùa nghỉ: bảng rỗng HẲN và đã biết ngày khai mạc. Chỉ rỗng thôi thì vẫn giữ
  // teaser cũ vì có thể là ngày trống giữa mùa, không phải trước khai mạc.
  const preseason =
    daysToOpen !== null && picks.length === 0 && noPlays.length === 0 && watching.length === 0;

  // Khối nổi bật = 2 bài MỚI NHẤT, BẤT KỂ LOẠI, gộp cả ba nguồn (Nick 25/8).
  //
  // Trước đây chỉ lấy bài NHÌN LẠI (recap). Hỏng ở chỗ: recap chỉ có khi trận đã
  // đá xong và có tỷ số, nên vài ngày không trận là đầu trang đứng hình — Nick
  // chụp lại 25/8, hai thẻ đầu vẫn là bài 22/8 và 23/8 trong khi tin 25/8 nằm
  // dưới màn hình đầu.
  //
  // Buộc khối này vào MỘT loại nội dung là sai từ gốc: loại đó ngừng ra thì khối
  // đứng. Nick chỉ ra tin chuyển nhượng cũng sẽ dính y hệt khi hết kỳ chuyển
  // nhượng (30 ngày qua: 27/30 bài là chuyển nhượng, tức 90%).
  //
  // Nên gộp cả ba nguồn rồi xếp theo ngày đăng: mùa chuyển nhượng thì tin lên
  // đầu, mùa giải chạy thì bài nhìn lại lên, lúc khác thì bài phân tích lên.
  type RecapCard = { slug: string; title: string; league: string; published_at: string; hero: string; excerpt: string; href: string; nhan: string };
  const recaps: RecapCard[] = [
    ...articles.map((a): RecapCard => ({
      slug: a.slug,
      title: a.title,
      league: a.league,
      published_at: a.published_at,
      hero: a.hero_image ?? `/api/og/analysis/${a.slug}?locale=${lang}&v=${OG_VERSION}`,
      excerpt: a.meta_description || analysisExcerpt(a.body),
      href: withLang(`/analysis/${a.slug}`, lang),
      nhan: a.kind === "recap" ? dict.analysis.tabs.recap : dict.analysis.tabs.analysis,
    })),
    ...recapPosts.map((p): RecapCard => ({
      slug: p.slug,
      title: p.title,
      league: "",
      published_at: p.published_at ?? "",
      hero: `/api/og/editorial?title=${encodeURIComponent(p.title)}&v=${OG_VERSION}`,
      excerpt: p.meta_description ?? "",
      href: withLang(`/analysis/${p.slug}`, lang),
      nhan: dict.analysis.tabs.recap,
    })),
    ...newsItems.map((n): RecapCard => ({
      slug: n.slug,
      title: getHeadline(n, lang),
      league: "",
      published_at: n.published_at ?? "",
      hero: n.hero_card_url ?? `/api/og/news/${n.slug}?locale=${lang}&v=${OG_VERSION}`,
      excerpt: (getBody(n, lang) ?? "").slice(0, 160),
      href: withLang(`/news/${n.slug}`, lang),
      nhan: dict.home.latestNews,
    })),
  ]
    .filter((x) => x.published_at)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 2);
  // Banner kèo — Peter 25/8: "trang chủ mình có gì đó move sang trang Dự đoán
  // và kèo". Dự đoán đã có banner riêng từ trước; /keo thì KHÔNG xuất hiện ở đâu
  // trên trang chủ, người dùng chỉ vào được qua thanh menu trên cùng.
  const ngayVN = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
  const homNay = ngayVN(new Date());
  const keoHomNay = oddsMatches.filter((m) => ngayVN(new Date(m.kickoffUtc)) === homNay).length;

  const hot = recaps[0] ?? null;
  const restArticles = articles.filter((a) => !recaps.some((r) => r.slug === a.slug)).slice(0, 6);
  // Nhận định mới nhất — lấp ô trống cột phải (Nick 20/8, Cách A). Bài dự đoán/nhận
  // định (kind preview|analysis) — loại đã hiện ở lead/2 thẻ compact, tối đa 4, text-only.
  const shownSlugs = new Set(
    [hot?.slug, ...restArticles.slice(0, 3).map((a) => a.slug)].filter(Boolean),
  );
  const predictions = articles
    .filter((a) => (a.kind === "preview" || a.kind === "analysis") && !shownSlugs.has(a.slug))
    .slice(0, 4);
  const predDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : lang, {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(iso));

  return (
    <>
      {/* Top scoreboard rail (ESPN strip) — reuses the same match data as HomeNextMatches. */}
      <ScoreboardRail
        matches={stripMatches}
        lang={lang}
        labels={{ title: dict.home.scoreboardTitle, finished: dict.matches.finished }}
      />
      <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      {/* 1. Hero: brand positioning + curator record + form
          Đệm dọc thu lại trên ĐIỆN THOẠI (Peter chụp màn hình 2/9/2026: khối này
          ăn trọn màn đầu, đẩy "Bảng Dự Đoán Hôm Nay" xuống dưới nếp gấp).
          Đo trên màn 390x640 — chiều cao dùng được thật của điện thoại sau khi
          trừ thanh trình duyệt:
            trước  khối đầu 458px · nội dung thật ở 652px → phải cuộn mới thấy
            sau    khối đầu 332px · nội dung thật ở 526px → lọt màn đầu
          Máy tính bàn GIỮ NGUYÊN md:py-20, không đụng. */}
      <section className="relative overflow-hidden py-7 text-center sm:py-12 md:py-20">
        <div className="hero-glow" aria-hidden />
        {/* Mobile pitch (slice) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13] dark:opacity-[0.2] md:hidden" viewBox="0 0 1100 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect x="0" y="0" width="1100" height="400" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0f9e7a] dark:text-brand" />
          <line x1="550" y1="0" x2="550" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="3" fill="currentColor" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        {/* Desktop pitch (meet) */}
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-[0.13] dark:opacity-[0.2] md:block" viewBox="0 0 1100 400" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <rect x="0" y="0" width="1100" height="400" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0f9e7a] dark:text-brand" />
          <line x1="550" y1="0" x2="550" y2="400" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <circle cx="550" cy="200" r="3" fill="currentColor" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="0" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 120 160 A 40 40 0 0 1 120 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="980" y="80" width="120" height="240" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <rect x="1050" y="130" width="50" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="text-[#0f9e7a] dark:text-brand" />
          <path d="M 980 160 A 40 40 0 0 0 980 240" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#0f9e7a] dark:text-brand" />
        </svg>
        <div className="relative">
          {/* Nick 2/9/2026: trên ĐIỆN THOẠI bỏ bớt chữ ở khối đầu trang. Tiêu đề
              rút còn vế đầu (vẫn là H1 thật, vẫn giữ từ khoá chính — KHÔNG ẩn hẳn,
              Google index theo bản điện thoại trước), câu dẫn và khối phong độ ẩn
              hẳn. Máy tính bàn giữ nguyên đầy đủ. */}
          <h1 className="hero-gradient-text mx-auto max-w-[700px] font-display text-2xl font-bold sm:text-4xl md:text-5xl">
            <span className="sm:hidden">{dict.taglineShort}</span>
            <span className="hidden sm:inline">{dict.tagline}</span>
          </h1>
          <p className="hidden text-muted sm:mt-4 sm:block sm:text-base md:text-lg">{dict.board.subtitle}</p>
          {record.settled > 0 && (
            <p className="mt-3 inline-flex items-center gap-3 rounded-full border border-line bg-card px-5 py-2 font-display text-sm sm:mt-6">
              <span className="text-muted">{dict.pick.curator}</span>
              <span className="font-semibold text-ink">
                {record.wins}-{record.losses}-{record.pushes}
              </span>
              <span
                className={`font-semibold ${record.units_pl >= 0 ? "text-brand" : "text-loss"}`}
              >
                {formatUnits(record.units_pl)}
              </span>
              {/* Ngày "tính đến" đẩy viên thành 3 dòng trên màn 390px (tên "Chú Tám
                  Banh" bị bẻ dọc). Ẩn trên điện thoại, giữ tỉ số W-L-P làm bằng
                  chứng thành tích — đó là định vị của trang. */}
              <span className="hidden text-muted sm:inline">
                · {dict.board.asOf} {formatBoardDate(new Date(), lang)}
              </span>
            </p>
          )}
          {form.length > 0 && (
            <div className="mt-3 hidden flex-col items-center gap-1.5 text-sm sm:mt-4 sm:flex">
              {/* Nick 25/8: ghi rõ đây là sổ của ai. Khối này CHỈ lấy nhận định
                  của curator (§7.1), nên để trống tên thì người xem tưởng trang
                  giấu trận thua của Trợ lý AI — chính anh đã hiểu nhầm như vậy.
                  Lấy tên từ dict cho khớp với chỗ khác, không đóng cứng chuỗi. */}
              <span className="text-muted">
                {dict.board.formTitle} — {dict.pick.curator}
              </span>
              <div className="flex flex-wrap justify-center gap-1.5 py-1">
                {form.map((p) => (
                  <Link
                    key={p.id}
                    href={withLang(`/play/${p.id}`, lang)}
                    prefetch={false}
                    title={`${p.home_team} ${p.home_score ?? ""}-${p.away_score ?? ""} ${p.away_team}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-xs font-bold transition-transform hover:-translate-y-0.5 ${formClass[p.status] ?? "border-line bg-card text-muted"}`}
                  >
                    {formLetter[p.status] ?? "\u2013"}
                  </Link>
                ))}
              </div>
              <span className="text-xs text-muted">
                {dict.board.last30}{" "}
                <strong className={units30 >= 0 ? "text-brand" : "text-loss"}>
                  {formatUnits(units30)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Daily Board teaser — below the hero (Nick 17/8 order): the day's picks
          are the first thing after the fixtures strip (Nick 16/8). Preseason
          countdown when the board is empty, so the homepage doesn't read as
          broken with "0 · 0 · 0" between seasons. */}
      {/* Nick 2/9: trên ĐIỆN THOẠI kéo khối "Nhận định nổi bật" sát băng Bảng Dự
          Đoán hơn — khe 40px làm hai khối nhìn như hai phần rời nhau. Còn 16px
          trên điện thoại, máy tính bàn giữ nguyên 40px vì màn rộng cần khe thở. */}
      <section className="pb-4 pt-6 sm:pb-10">
        {preseason ? (
          <Link
            href={withLang("/competitions/premier-league/fixtures", lang)}
            className="group flex flex-wrap items-center justify-between gap-5 rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5 transition-colors hover:border-brand/60"
          >
            <div className="flex items-center gap-5">
              <div className="text-center leading-none">
                <div className="font-display text-4xl font-bold text-brand tabular-nums">
                  {daysToOpen}
                </div>
                <div className="mt-1 text-xs text-muted">{dict.home.daysLabel}</div>
              </div>
              <div>
                <p className="font-display text-lg font-bold">{dict.home.preseasonTitle}</p>
                <p className="mt-1 max-w-[46ch] text-sm text-muted">{dict.home.preseasonBody}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
              {dict.home.viewFixtures} &rarr;
            </span>
          </Link>
        ) : (
          /* Nick 2/9: gộp HAI băng thành MỘT — trước đây ngày tháng và nút
             "Xem Bảng Dự Đoán Hôm Nay" bị in hai lần liền nhau, đọc như lỗi.
             Gộp phần KHUNG (tiêu đề + ngày + nút), KHÔNG gộp SỐ: mỗi bên vẫn
             một dòng riêng, có tên và chấm màu riêng (xanh thương hiệu cho Chú
             Tám Banh, #6b9e9e cho Trợ lý AI — đúng màu đã dùng ở /about,
             /archive, /track-record). Cộng chung thành tích hai bên là phá
             tường lửa Curator/Scout, thứ khiến trang mình đáng tin. */
          <div className="rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5">
            <p className="font-display text-lg font-bold">{dict.board.title}</p>
            <p className="mt-1 text-sm text-muted">{formatBoardDate(new Date(), lang)}</p>
            <div className="mt-4 flex flex-col gap-2">
              {[bangBac, bangAI].map((b) => (
                <Link
                  key={b.href}
                  href={b.href}
                  className="group/hang flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 self-start rounded-full ${b.cham}`} aria-hidden />
                  <span className="font-semibold text-ink group-hover/hang:underline">{b.ten}</span>
                  <span className="text-muted">
                    {b.so.map((o, i) => (
                      <span key={o.nhan}>
                        {i > 0 && <span className="mx-2">·</span>}
                        {o.nhan}: <strong className="text-ink">{o.gia}</strong>
                      </span>
                    ))}
                    {b.ghiChu}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href={withLang("/daily-board", lang)}
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5"
            >
              {dict.home.viewBoard} &rarr;
            </Link>
          </div>
        )}
      </section>

      {/* 1b-bis. Banner Kèo — ngay dưới banner Dự đoán vì cùng nhóm "tra cứu trước
          trận". Chỉ hiện khi thật sự có kèo; không có thì ẩn hẳn, đừng để banner
          rỗng dẫn sang trang trống. */}
      {oddsMatches.length > 0 && (
        <section className="pb-10">
          <Link
            href={withLang("/keo", lang)}
            className="group flex flex-wrap items-center justify-between gap-4 rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5 transition-colors hover:border-brand/60"
          >
            <div>
              <p className="font-display text-lg font-bold">{dict.home.oddsTitle}</p>
              <p className="mt-1 text-sm text-muted">
                {dict.home.oddsToday.replace("{n}", String(keoHomNay))}
                <span className="mx-2">·</span>
                {dict.home.oddsWindow.replace("{n}", String(oddsMatches.length))}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform group-hover:-translate-y-0.5">
              {dict.home.viewOdds} &rarr;
            </span>
          </Link>
        </section>
      )}

      {/* 1c. Hot pick prediction — the top curator pick. Omitted when there is none
          (never a fabricated seed). */}
      {heroPick && (
        <section className="pb-10">
          <HotPickCard
            pick={heroPick}
            predicted={null}
            lang={lang}
            href={withLang("/daily-board", lang)}
            ctaLabel={dict.home.viewBoard}
            thesisText={heroThesis ?? undefined}
          />
        </section>
      )}

      {/* 2b. Hai bài NHÌN LẠI gần nhất — BELOW the pick/watching/noplay content.
          Nick 22/8: "Hai bài nhìn lại gần nhất phải hiện ở đây. Bài mới ở
          trên/trái, bài cũ ở dưới/phải" (replaces the 17/8 hand-picked marquee). */}
      {recaps.length > 0 && (
        <section className="pt-4 pb-10">
          <div className="grid gap-5 md:grid-cols-2">
            {recaps.map((r, i) => (
              <Link
                key={r.slug}
                // Không hardcode /analysis nữa: khối này giờ có cả bài tin, mà
                // bài tin nằm ở /news — trỏ nhầm là ra trang 404.
                href={r.href}
                prefetch={false}
                className="group flex flex-col overflow-hidden rounded-card border border-brand/40 bg-card shadow-raised transition-colors hover:border-brand/60"
              >
                <div
                  className="relative aspect-[1.9/1] bg-cover bg-center"
                  style={{ backgroundImage: `url(${r.hero})` }}
                  aria-hidden
                />
                <div className="flex flex-1 flex-col gap-2.5 p-5 md:p-6">
                  <span className="font-display text-xs font-bold uppercase tracking-widest text-brand">
                    ◆ {i === 0 ? dict.home.featuredStory : r.nhan}
                  </span>
                  <h2 className="line-clamp-2 font-display text-xl font-bold leading-tight transition-colors group-hover:text-brand md:text-2xl">
                    {r.title}
                  </h2>
                  <p className="text-sm text-muted">
                    {r.league && (
                      <>
                        {r.league}
                        <span className="mx-2">·</span>
                      </>
                    )}
                    {formatPostDate(r.published_at, lang)}
                  </p>
                  {r.excerpt && <p className="text-sm text-muted line-clamp-2">{r.excerpt}</p>}
                  <span className="mt-auto inline-flex w-fit items-center gap-2 pt-1 font-display text-sm font-semibold text-brand transition-transform group-hover:-translate-y-0.5">
                    {dict.home.viewAnalysisCta} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3b. Matches strip — full container width, not boxed into the main column
          (Nick 17/8: "kéo dài ra" — the column squeezed it to ~3 visible cards). */}
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

      {/* 3a. TIN MỚI NHẤT — news_items lên trang chủ (Nick 21/8: tin không lên
          homepage vì trước chỉ query analysis_articles). Ngay dưới dải trận. */}
      {newsItems.length > 0 && (
        <section className="pb-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">{dict.home.latestNews}</h2>
            <Link
              href={withLang("/news", lang)}
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.home.allNews} &rarr;
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newsItems.map((n) => (
              <Link
                key={n.id}
                href={withLang(`/news/${n.slug}`, lang)}
                prefetch={false}
                className="group overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-brand/30"
              >
                {n.hero_card_url && (
                  <img
                    src={n.hero_card_url}
                    alt=""
                    width={1200}
                    height={630}
                    className="w-full"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  <time className="text-xs text-muted" dateTime={n.published_at}>
                    {formatPostDate(n.published_at, lang)}
                  </time>
                  <p className="mt-1.5 line-clamp-2 font-display text-sm font-bold leading-snug transition-colors group-hover:text-brand">
                    {getHeadline(n, lang)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Latest analysis — FULL WIDTH, ESPN style (Nick 17/8: "dùng toàn bộ chiều
          ngang... theo kiểu ESPN"). Right sidebar dropped: the record box duplicated the
          hero's record line; the Telegram CTA moved below as a thin band. */}
      {restArticles.length > 0 && (
        <section className="pb-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">{dict.home.latestAnalysis}</h2>
            <Link
              href={withLang("/analysis", lang)}
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.nav.analysis} &rarr;
            </Link>
          </div>
          {/* Top: lead ~2/3 + up to 2 compact cards stacked in the right third
              (fills the gap Nick flagged 17/8). Rest drop to a 3-up grid below. */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <AnalysisCard article={restArticles[0]} lang={lang} variant="lead" />
              {/* Telegram CTA — lấp lỗ trống cột trái dưới thẻ nổi bật (Nick 21/8);
                  mobile: xếp dọc, nút full-width. */}
              <div className="flex flex-col gap-3 rounded-card border border-brand/30 bg-brand-dim/40 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold">{dict.home.telegramTitle}</h2>
                  <p className="mt-1 text-sm text-muted">{dict.home.telegramPitch}</p>
                </div>
                <a
                  href="https://t.me/banhbongnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 font-display text-sm font-semibold text-bg transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  {dict.home.joinTelegram} &rarr;
                </a>
              </div>
            </div>
            {restArticles.length > 1 && (
              <div className="flex flex-col gap-5">
                {restArticles.slice(1, 3).map((a) => (
                  <AnalysisCard key={a.slug} article={a} lang={lang} variant="list" />
                ))}
                {predictions.length > 0 && (
                  <div className="rounded-2xl border border-line bg-card/40 p-4">
                    <h3 className="mb-2 font-display text-sm font-bold text-muted">
                      {dict.home.latestPredictions}
                    </h3>
                    <ul className="flex flex-col divide-y divide-line">
                      {predictions.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={withLang(`/analysis/${a.slug}`, lang)}
                            prefetch={false}
                            className="group flex flex-col gap-1 py-2.5"
                          >
                            <span className="text-xs text-muted">
                              {a.league} &middot; {predDate(a.published_at)}
                            </span>
                            <span className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
                              {a.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          {restArticles.length > 3 && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restArticles.slice(3).map((a) => (
                <AnalysisCard key={a.slug} article={a} lang={lang} variant="lead" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Learn strip: calculators + guides */}
      <section className="grid gap-4 pb-10 sm:grid-cols-2">
        <Link
          href={withLang("/calculators", lang)}
          prefetch={false}
          className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-brand/30"
        >
          <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">
            {dict.nav.calculators} &rarr;
          </h2>
          <p className="mt-2 text-sm text-muted">{dict.calculators.subtitle}</p>
        </Link>
        <Link
          href={withLang("/guides", lang)}
          prefetch={false}
          className="group rounded-card border border-line bg-card p-6 transition-colors hover:border-brand/30"
        >
          <h2 className="font-display text-lg font-bold transition-colors group-hover:text-brand">
            {dict.nav.guides} &rarr;
          </h2>
          <p className="mt-2 text-sm text-muted">{dict.guides.subtitle}</p>
        </Link>
      </section>

      {/* 5. Trust strip: §7.1 firewall stated in plain words + About */}
      <section className="pb-14">
        <div className="rounded-card border border-line bg-card px-6 py-6">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />
              <span>{dict.home.trustCurator}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#6b9e9e]" aria-hidden />
              <span>{dict.home.trustScout}</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href={withLang("/about", lang)}
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.nav.about} &rarr;
            </Link>
            <Link
              href={withLang("/archive", lang)}
              prefetch={false}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {dict.board.trackRecordCta} &rarr;
            </Link>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
