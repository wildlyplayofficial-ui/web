import type { Metadata } from "next";
import { metaTipTheoNgay, TrangTipTheoNgay } from "@/components/trang-tip-theo-ngay";
import { resolveLang } from "@/lib/i18n";

/** Dự đoán gom theo loại kèo cho một ngày trong 5 ngày tới (giờ VN). */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string; ngay: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return metaTipTheoNgay("tai-xiu", p.ngay, resolveLang(p.lang));
}

export default async function Trang({ params }: Props) {
  const p = await params;
  return <TrangTipTheoNgay loai="tai-xiu" ngay={p.ngay} lang={resolveLang(p.lang)} />;
}
