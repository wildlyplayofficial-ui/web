import type { Metadata } from "next";
import { metaTipNgay, TrangTipNgay, tipNgay } from "@/components/trang-tip-ngay";
import { resolveLang } from "@/lib/i18n";

/** Dự đoán gom theo loại kèo cho ngày mai (giờ VN). */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { homNay, ds } = await tipNgay("thang-hai-doi-ghi-ban", "ngay-mai");
  return metaTipNgay("thang-hai-doi-ghi-ban", homNay, ds.length, resolveLang((await params).lang), "ngay-mai");
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const { homNay, ds } = await tipNgay("thang-hai-doi-ghi-ban", "ngay-mai");
  return <TrangTipNgay loai="thang-hai-doi-ghi-ban" homNay={homNay} ds={ds} lang={lang} ky="ngay-mai" />;
}
