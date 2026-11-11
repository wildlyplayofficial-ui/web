import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DongTran } from "@/components/dong-tran";
import { TranBaO, TranHero, TranPhongDo } from "@/components/tran-chi-tiet";
import { TranKeoPhu } from "@/components/tran-keo-phu";
import { TranSoLieu } from "@/components/tran-so-lieu";
import { OG_VERSION, SITE_URL } from "@/lib/brand";
import { tranDuocIndex } from "@/lib/chi-muc";
import { jsonLd, suKienTran } from "@/lib/du-doan-schema";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { cauTomTat, metaTran, tieuDeTran, timTran, tranLienQuan } from "@/lib/du-doan-tran";
import { keoPhuTuan, soLieuTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, getDict, resolveLang, withLang } from "@/lib/i18n";

/**
 * Trang riêng một trận (thiết kế lại 10/11): /du-doan/{slug}. Trận nào trong bảng dự đoán
 * cũng có trang; chỉ trận qua `tranDuocIndex` (giải lớn · đội tuyển · có Việt Nam) mới mời
 * Google lập chỉ mục + vào sitemap, còn lại noindex,follow. Trang sống chừng nào trận còn
 * trong dữ liệu (bài dự đoán hoặc tệp tuần); hết thì 404.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: l, slug } = await params;
  const h = timTran((await taiDuDoan()).hang, slug);
  if (!h) return {};
  const { tieuDe, moTa } = metaTran(h);
  return {
    title: tieuDe,
    description: moTa,
    alternates: buildAlternates(`/du-doan/${slug}`, resolveLang(l)),
    ...(tranDuocIndex(h) ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      locale: "vi_VN",
      title: `${tieuDe} | banhbong.net`,
      description: moTa,
      images: [{ url: `/api/og/editorial?title=${encodeURIComponent(`${h.nha} vs ${h.khach}`)}&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";

export default async function TrangTran({ params }: Props) {
  const { lang: l, slug } = await params;
  const lang = resolveLang(l);
  const { muc, hang } = await taiDuDoan();
  const h = timTran(hang, slug);
  if (!h) notFound();
  const tacGia = muc.find((m) => m.bai.slug === slug)?.bai.byline ?? null;
  const lienQuan = tranLienQuan(hang, h);
  const soLieu = soLieuTuan(slug);
  const keoPhu = keoPhuTuan(slug);
  const cap = `${h.nha} vs ${h.khach}`;

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: "/" },
          { name: "Dự đoán", url: "/du-doan" },
          { name: cap, url: `/du-doan/${slug}` },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", ...suKienTran(h, SITE_URL, true) }) }} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span>{h.giai}</span>
        <span aria-hidden className="hidden sm:inline">›</span>
        <span className="hidden text-ink sm:inline">{cap}</span>
      </nav>
      <h1 className="font-display text-[22px] font-bold leading-tight sm:text-[30px]">{tieuDeTran(h)}</h1>
      <TranHero h={h} lang={lang} tacGia={tacGia} />
      <TranBaO h={h} lang={lang} />
      <p className="mt-4 text-[15px] leading-relaxed sm:text-base">{cauTomTat(h)}</p>
      <TranPhongDo h={h} lang={lang} />
      {keoPhu && <TranKeoPhu k={keoPhu} />}
      {soLieu && <TranSoLieu so={soLieu} logo={[h.logoNha, h.logoKhach]} />}

      {lienQuan.ds.length > 0 && (
        <section className="mt-8">
          <h2 className="border-b border-line pb-2 font-display text-[19px] font-bold sm:text-[22px]">
            {lienQuan.cungNgay ? `Dự đoán ${h.giai} cùng ngày` : "Trận kế tiếp"}
          </h2>
          <ul>
            {lienQuan.ds.map((x) => (
              <li key={x.slug}>
                <DongTran h={x} lang={lang} hienGiai={!lienQuan.cungNgay} />
              </li>
            ))}
          </ul>
          <Link href={withLang("/du-doan", lang)} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
            {getDict(lang).duDoan.seeAll} →
          </Link>
        </section>
      )}
    </div>
  );
}
