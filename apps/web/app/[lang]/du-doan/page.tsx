import type { Metadata } from "next";
import Link from "next/link";
import { OG_VERSION, SITE_URL } from "@/lib/brand";
import { cauHoiDuDoan, faqSchema, jsonLd, metaDuDoan, suKienTran, type CauHoi } from "@/lib/du-doan-schema";
import { getBaiDuDoan } from "@/lib/du-doan";
import { cacTranChon } from "@/lib/chon-tran";
import { ChonTran } from "@/components/chon-tran";
import { buildAlternates, resolveLang, withLang } from "@/lib/i18n";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { DuDoanPZ } from "@/components/du-doan-pz";
import { ngayVN } from "@/lib/du-doan-hang";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { CAU_HINH, LOAI_TIP } from "@/components/trang-tip-ngay";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  // Ngày theo giờ VN (kiểu PredictZ "Tips Today - {ngày}"); trang revalidate 300s nên qua ngày tự đổi.
  const { tieuDe, moTa } = metaDuDoan(Date.now());
  return {
    title: tieuDe,
    description: moTa,
    alternates: buildAlternates("/du-doan", lang),
    openGraph: {
      locale: "vi_VN",
      title: `${tieuDe} | banhbong.net`,
      description: moTa,
      images: [{ url: `/api/og/editorial?title=D%E1%BB%B1%20%C4%91o%C3%A1n&v=${OG_VERSION}`, width: 1200, height: 630 }],
    },
  };
}

/** Câu hỏi nhanh: hiện ra trang (FAQ schema phải khớp chữ người đọc thấy). */
function HoiNhanh({ ds }: { ds: CauHoi[] }) {
  return (
    <section aria-labelledby="hoi-nhanh" className="mt-12">
      <h2 id="hoi-nhanh" className="font-display text-2xl font-bold">Hỏi nhanh</h2>
      <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
        {ds.map((c) => (
          <div key={c.hoi} className="px-4 py-3">
            <dt className="font-display text-sm font-bold">{c.hoi}</dt>
            <dd className="mt-1 text-sm text-muted">{c.dap}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function DuDoanHub({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const [{ hang }, baiChon] = await Promise.all([taiDuDoan(), getBaiDuDoan()]);
  const hoi = cauHoiDuDoan(hang);
  // Mỗi trận một SportsEvent (60 trận gần nhất là đủ — như FixturesJsonLd), url = trang riêng của trận.
  const suKien = hang.slice(0, 60).map((h) => suKienTran(h, SITE_URL, true));

  return (
    <div className="mx-auto max-w-[1100px] px-0 py-4 sm:px-5 sm:py-8">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Dự đoán", url: "/du-doan" }]} />
      {suKien.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Dự đoán bóng đá",
              itemListElement: suKien.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
            }),
          }}
        />
      )}
      {hoi.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(hoi)) }} />}
      <DuDoanPZ rows={hang} homNay={ngayVN(Date.now())} lang={lang} />
      <nav aria-label="Dự đoán theo loại kèo" className="mt-6 flex flex-wrap gap-2 px-3.5 sm:px-2.5">
        {LOAI_TIP.map((l) => (
          <Link key={l} href={withLang(CAU_HINH[l].duong, lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
            {CAU_HINH[l].tieuDe}
          </Link>
        ))}
        <Link href={withLang("/chuoi-dang-chu-y", lang)} className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-muted hover:text-ink">
          Chuỗi đáng chú ý
        </Link>
      </nav>
      <div className="mt-6 px-2.5">
        <ChonTran nhom={cacTranChon(baiChon, Date.now())} lang={lang} />
      </div>

      {/* Peter 11/11: bỏ danh sách bài Chú Tám Banh theo giải khỏi trang dự đoán. */}
      <div className="px-2.5">
        {hoi.length > 0 && <HoiNhanh ds={hoi} />}
      </div>

      <p className="mt-10 px-2.5 text-xs text-muted">
        Xem thêm{" "}
        <Link href={withLang("/analysis", lang)} className="text-brand hover:underline">mọi bài phân tích</Link>.
      </p>
    </div>
  );
}
