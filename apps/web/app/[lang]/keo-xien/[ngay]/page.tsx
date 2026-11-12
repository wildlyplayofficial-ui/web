import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { metaKeoXien, TrangKeoXien, xienCuaNgay } from "@/components/trang-keo-xien";
import { ngayVN } from "@/lib/du-doan-hang";
import { ngayTuSlug } from "@/lib/du-doan-loc";
import { resolveLang } from "@/lib/i18n";

/** Kèo xiên một ngày sắp tới: /keo-xien/ngay-mai, /keo-xien/thu-bay… Ngày không gom được xiên → 404. */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string; ngay: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const homNay = ngayVN(Date.now());
  const ngay = ngayTuSlug(p.ngay, homNay);
  return ngay ? metaKeoXien(ngay, homNay, resolveLang(p.lang)) : {};
}

export default async function Trang({ params }: Props) {
  const p = await params;
  const homNay = ngayVN(Date.now());
  const ngay = ngayTuSlug(p.ngay, homNay);
  if (!ngay) notFound();
  const kq = await xienCuaNgay(ngay);
  if (kq.ds.length === 0) notFound();
  return <TrangKeoXien ngay={ngay} homNay={homNay} {...kq} lang={resolveLang(p.lang)} />;
}
