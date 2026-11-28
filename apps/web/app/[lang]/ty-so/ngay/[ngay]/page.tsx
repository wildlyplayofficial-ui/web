import type { Metadata } from "next";
import { metaTipTheoNgay, TrangTipTheoNgay } from "@/components/trang-tip-theo-ngay";
import { resolveLang } from "@/lib/i18n";

/** Dự đoán gom theo loại kèo cho một ngày trong 5 ngày tới (giờ VN). */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string; ngay: string }> };

// Thiếu generateStaticParams thì Next coi trang là động: `revalidate` mất tác dụng,
// mỗi lượt xem (kể cả bot) chạy một function. Mảng rỗng = dựng lúc có người mở rồi đệm.
export const dynamic = "force-static";
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return metaTipTheoNgay("ty-so", p.ngay, resolveLang(p.lang));
}

export default async function Trang({ params }: Props) {
  const p = await params;
  return <TrangTipTheoNgay loai="ty-so" ngay={p.ngay} lang={resolveLang(p.lang)} />;
}
