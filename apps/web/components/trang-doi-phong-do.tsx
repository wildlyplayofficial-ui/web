import type { Metadata } from "next";
import Link from "next/link";
import { BangDoiPhongDo } from "@/components/bang-doi-phong-do";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-jsonld";
import { OG_VERSION } from "@/lib/brand";
import { xepDoiPhongDo, type DongPhongDo } from "@/lib/doi-phong-do";
import { ngayVN } from "@/lib/du-doan-hang";
import { lechNgay } from "@/lib/du-doan-loc";
import { taiDuDoan } from "@/lib/du-doan-tai";
import { phongDoChungTuan } from "@/lib/du-doan-tuan";
import { buildAlternates, withLang, type Lang } from "@/lib/i18n";

/** Trang "Đội phong độ tốt nhất" (Peter duyệt mục G, 14/11): đội có trận trong 7 ngày tới, xếp theo phong độ chung. */

export const DUONG = "/doi-phong-do-tot-nhat";
const TIEU_DE = "Đội phong độ tốt nhất";

export async function doiPhongDo(): Promise<DongPhongDo[]> {
  const homNay = ngayVN(Date.now());
  const { hang } = await taiDuDoan();
  return xepDoiPhongDo(hang, homNay, lechNgay(homNay, 6), phongDoChungTuan);
}

export function metaDoiPhongDo(so: number, lang: Lang): Metadata {
  const title = so > 0 ? `${TIEU_DE} tuần này: top ${so} đội` : TIEU_DE;
  const description = `Bảng xếp hạng ${so} đội đang có phong độ tốt nhất và sắp thi đấu trong 7 ngày tới: điểm phong độ chung thang 10, 5 trận gần nhất và trận kế tiếp. Giờ Việt Nam.`;
  return {
    title,
    description,
    alternates: buildAlternates(DUONG, lang),
    ...(so === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { locale: "vi_VN", title: `${title} | banhbong.net`, description, images: [{ url: `/api/og/editorial?title=${encodeURIComponent(TIEU_DE)}&v=${OG_VERSION}`, width: 1200, height: 630 }] },
  };
}

const MANH = "inline-flex min-h-11 items-center hover:text-ink";

export function TrangDoiPhongDo({ ds, lang }: { ds: DongPhongDo[]; lang: Lang }) {
  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-2 sm:px-5 sm:py-6">
      <BreadcrumbJsonLd items={[{ name: "Trang chủ", url: "/" }, { name: "Dự đoán", url: "/du-doan" }, { name: TIEU_DE, url: DUONG }]} />
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
        <Link href={withLang("/", lang)} className={MANH}>Trang chủ</Link>
        <span aria-hidden>›</span>
        <Link href={withLang("/du-doan", lang)} className={MANH}>Dự đoán</Link>
        <span aria-hidden>›</span>
        <span className="text-ink">{TIEU_DE}</span>
      </nav>
      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight sm:text-[30px]">{TIEU_DE} tuần này</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {ds.length > 0
          ? `${ds.length} đội sắp thi đấu trong 7 ngày tới, xếp theo điểm phong độ chung (thang 1 đến 10, cao là phong độ tốt hơn), hòa điểm thì xét 5 trận gần nhất. Bấm vào đội để mở trang trận kế tiếp.`
          : "Chưa đủ dữ liệu phong độ cho các trận trong 7 ngày tới. Bạn có thể xem dự đoán các ngày khác ở trang Dự đoán."}
      </p>
      {ds.length > 0 && <BangDoiPhongDo ds={ds} lang={lang} />}
      <p className="mt-4 text-xs text-muted">T thắng · H hòa · B thua, ô bên phải là trận gần đây nhất. Nội dung mang tính giải trí và tham khảo.</p>
    </div>
  );
}
