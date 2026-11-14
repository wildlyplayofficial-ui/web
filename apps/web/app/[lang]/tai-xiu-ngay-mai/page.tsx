import type { Metadata } from "next";
import { metaTipNgay, TrangTipNgay, tipNgay } from "@/components/trang-tip-ngay";
import { resolveLang } from "@/lib/i18n";

/** Dự đoán gom theo loại kèo cho ngày mai (giờ VN). */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { homNay, ds } = await tipNgay("tai-xiu", "ngay-mai");
  return metaTipNgay("tai-xiu", homNay, ds.length, resolveLang((await params).lang), "ngay-mai");
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const { homNay, ds } = await tipNgay("tai-xiu", "ngay-mai");
  return <TrangTipNgay loai="tai-xiu" homNay={homNay} ds={ds} lang={lang} ky="ngay-mai" />;
}
