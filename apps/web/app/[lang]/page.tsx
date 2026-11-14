import type { Metadata } from "next";
import { OG_VERSION } from "@/lib/brand";
import Link from "next/link";
import {
  getActiveWatching,
  getTodaysNoPlays,
  getAllBlogSlugs,
  getRecentRecapPosts,
  getTodaysPicks,
  getTrackRecordForAuthor,
} from "@/lib/data";
import { buildPlaySlug } from "@/lib/play-slug";
import { locales } from "@/lib/format";
import { buildAlternates, getDict, resolveLang, withLang, type Lang } from "@/lib/i18n";
import { getCompetitionFixtures, getStandingsCompetitions } from "@/lib/standings-extra";
import { DaiDuDoanGiai } from "@/components/dai-du-doan-giai";
import { ScoreboardRail } from "@/components/scoreboard-rail";
import { railTran } from "@/lib/rail-tran";
import { canTraTySo, homNayVN, lechNgay, tySoTuLS } from "@/lib/ket-qua";
import { lichSuTySo } from "@/lib/ket-qua-ls";
import { getAnalysisArticles, getAllAnalysisArticleSlugs } from "@/lib/analysis-articles";
import { laTrangLichCaMua, newsDuocIndex, demChu } from "@/lib/chi-muc";
import { KhoiTrangTru } from "@/components/khoi-trang-tru";
import { AnalysisCard, analysisExcerpt } from "@/components/analysis-card";
import { getNewsItems, getHeadline, getBody } from "@/lib/news";
import { getOddsBoard } from "@/lib/odds-data";
import { getMucDuDoan } from "@/lib/du-doan";
import { doiCanPhongDo, dungHang } from "@/lib/du-doan-hang";
import { getTranDaDa } from "@/lib/phong-do-db";
import { doiThieuPhongDo, dongTuan, gopTuan, hangTuan } from "@/lib/du-doan-tuan";
import { KhoiDuDoanHomNay } from "@/components/khoi-du-doan-hom-nay";

export const revalidate = 300;

/** Ngoại hạng Anh trên Livescore — giải duy nhất có lịch tĩnh cả mùa. */
const EPL_LIVESCORE_ID = 2;

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
      locale: "vi_VN",
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

const bayGioMs = () => Date.now();

export default async function Home({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const dict = getDict(lang);
  const [allPicks, record, noPlays, watching, eplDays, competitions, articles, newsTho, oddsMatches, recapPosts, trangLich, blogs, mucDuDoan, lsKq] =
    await Promise.all([
      getTodaysPicks(),
      getTrackRecordForAuthor("curator"),
      getTodaysNoPlays(),
      getActiveWatching(),
      // Hai lượt này gọi nhà cung cấp NGOÀI. Từ 27/8 lsFetch có hạn chờ 6 giây,
      // nên quá hạn nó NÉM LỖI thay vì treo. Không hứng ở đây thì cả trang chủ
      // 500 — đổi một kiểu hỏng lấy một kiểu hỏng khác. Hứng rồi thì mất dải
      // trận, phần còn lại của trang vẫn lên.
      getCompetitionFixtures(EPL_LIVESCORE_ID).catch(() => []),
      getStandingsCompetitions().catch(() => []),
      getAnalysisArticles(undefined, 12),
      getNewsItems(undefined, 30),
      getOddsBoard(),
      getRecentRecapPosts(lang, 2),
      // Khối "Lịch & xem ở đâu" (9/11): trang chủ là trang duy nhất Google còn giữ,
      // trỏ thẳng vào nhóm trang duy nhất từng ăn click để Google đi tiếp vào đó.
      getAllAnalysisArticleSlugs()
        .then((all) => all.filter((a) => laTrangLichCaMua(a.slug)))
        .catch(() => []),
      // 9/11: trang chủ 0 link sang /blog → 37/37 bài blog Google chưa biết.
      getAllBlogSlugs().catch(() => []),
      // Khối "Dự đoán hôm nay" (10/11). Hỏng thì khối chỉ rỗng, trang vẫn lên.
      getMucDuDoan().catch(() => []),
      // Tỷ số các trận vừa đá cho dải trên cùng (cùng nguồn /ket-qua). Hỏng thì dải chỉ thiếu phần kết quả.
      lichSuTySo(lechNgay(homNayVN(), -1), homNayVN()).catch(() => []),
    ]);

  // 12/11: trang chủ chỉ dẫn tới tin Google được lập chỉ mục — trước đây 6 tin mới nhất
  // có cả tin mỏng/noindex, tức trang duy nhất Google tin lại dồn link vào trang bị giấu.
  const newsItems = newsTho
    .filter((n) => !n.noindex && newsDuocIndex(n.slug, n.published_at, demChu(getBody(n, lang))))
    .slice(0, 6);

  const todayKey = new Date().toISOString().slice(0, 10);

  const eplOpenDate = eplDays.length ? eplDays[0].date : null;
  const daysToOpen =
    eplOpenDate && eplOpenDate > todayKey
      ? Math.ceil((Date.parse(eplOpenDate + "T00:00:00Z") - Date.parse(todayKey + "T00:00:00Z")) / 86_400_000)
      : null;
  // §7.1: Home hero numbers are curator-only (never blend Scout results)
  const picks = allPicks.filter((p) => (p.author ?? "curator") === "curator");
  // Dòng "Chú Tám chọn": pick thật đầu tiên hôm nay, không có thì ghi rõ là không chọn.
  const [daDa, daDaTuan] = await Promise.all([getTranDaDa(doiCanPhongDo(mucDuDoan)), getTranDaDa(doiThieuPhongDo())]);
  const hangBai = gopTuan(dungHang(mucDuDoan, picks, oddsMatches, daDa));
  // Nguyên bảng dự đoán (bài + tệp tuần) lên trang chủ — Peter 10/11.
  const hangDuDoan = [...hangBai, ...hangTuan(hangBai, daDaTuan, Date.now())];
  const railMatches = railTran(hangDuDoan, bayGioMs(), tySoTuLS(canTraTySo(dongTuan()), lsKq));
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
      // Thẻ recap dùng CHUNG khuôn với /api/og/news: bài recap nằm trong bảng
      // posts (getPost đọc được), có pick_ids đã chấm → route dựng THẺ KẾT QUẢ
      // (tỉ số + HAI huy hiệu đội + cầu thủ). Trước đây trỏ /editorial ra thẻ
      // chữ trơn KHÔNG có logo đội — Peter chê xấu 13/9.
      hero: `/api/og/news/${p.slug}?locale=${lang}&v=${OG_VERSION}`,
      // Recap posts thường không có meta_description → rơi về tóm tắt lấy từ đầu
      // thân bài (Nick 13/9: thẻ nổi bật thiếu phần tóm tắt dưới tiêu đề).
      excerpt: p.meta_description || analysisExcerpt(p.body_md),
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
  // 13/11 (Peter: "ghi vừa đủ"): còn 3 bài (1 lớn + 2 nhỏ). Trước đây 6, ba thẻ lớn cuối là
  // bài lịch tháng 9 đã qua, dài thêm ~1.100px trên điện thoại.
  const restArticles = articles.filter((a) => !recaps.some((r) => r.slug === a.slug)).slice(0, 3);
  // Nhận định mới nhất — lấp ô trống cột phải (Nick 20/8, Cách A). Bài dự đoán/nhận
  // định (kind preview|analysis) — loại đã hiện ở lead/2 thẻ compact, tối đa 4, text-only.
  const shownSlugs = new Set(
    [hot?.slug, ...restArticles.slice(0, 3).map((a) => a.slug)].filter(Boolean),
  );
  const predictions = articles
    .filter((a) => (a.kind === "preview" || a.kind === "analysis") && !shownSlugs.has(a.slug))
    // Peter 13/11: chỉ bài trong 30 ngày, bài tháng 9 không còn là "mới nhất".
    .filter((a) => Date.now() - new Date(a.published_at).getTime() < 30 * 86_400_000)
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
        matches={railMatches}
        labels={{ title: dict.home.scoreboardTitle, finished: dict.matches.finished }}
      />
      <div className="mx-auto max-w-[1100px] px-5 overflow-x-hidden">
      {/* Thiết kế lại 10/11 (Peter duyệt mẫu): h1 + Chú Tám chọn + 8 trận sắp đá + MỘT nút
          sang /du-doan. Đã gỡ khối hero cũ, băng "Bảng Dự Đoán Hôm Nay" và thẻ pick nổi bật
          — ba lối vào dự đoán chồng nhau; pick Chú Tám nay nằm ở dòng vàng trong khối này. */}
      <KhoiDuDoanHomNay rows={hangDuDoan} homNay={homNay} lang={lang} />
      {/* Mùa nghỉ: đếm ngược tới ngày khai mạc (bảng rỗng hẳn và đã biết ngày mở màn). */}
      {preseason && (
        <section className="pb-4 pt-6 sm:pb-10">
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

      {/* 3b. Dải dự đoán theo giải + bài mới (12/11) — THAY dải trận cũ (HomeNextMatches)
          vốn đẩy 11 link /match/{slug} mỏng, tự noindex ra trang chủ. Cùng khung cuộn
          ngang full chiều rộng như cũ (Nick 17/8: "kéo dài ra"). */}
      <DaiDuDoanGiai lang={lang} baiMoi={articles} blogMoi={blogs} />

      {/* 3a-bis. Banner Kèo — Nick 2/9: chuyển XUỐNG đây, ngay dưới bài nổi bật và
          tin mới nhất. Trước nó nằm sát dưới băng Dự đoán và đẩy bài viết xuống dưới
          nếp gấp trên điện thoại — banner tra cứu chiếm chỗ của nội dung thật.
          Chỉ hiện khi thật sự có kèo; không có thì ẩn hẳn, đừng để banner rỗng dẫn
          sang trang trống. */}
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
        </section>
      )}

      {/* 3a. TIN MỚI NHẤT — news_items lên trang chủ (Nick 21/8). Peter 10/11: site
          dự đoán, không phải trang tin → khối tin chuyển XUỐNG dưới phân tích. */}
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
                  <time className="text-xs text-muted" dateTime={n.published_at ?? undefined}>
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

      <KhoiTrangTru
        lang={lang}
        trangLich={trangLich}
        blogs={blogs}
        giai={competitions.filter((c) => c.status === "active" && c.slug)}
      />

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
          <div className="flex flex-wrap gap-4">
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
