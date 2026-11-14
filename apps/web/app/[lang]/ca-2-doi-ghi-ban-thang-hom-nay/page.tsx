import type { Metadata } from "next";
import { metaTipNgay, TrangTipNgay, tipHomNay } from "@/components/trang-tip-ngay";
import { resolveLang } from "@/lib/i18n";

/** Dự đoán gom theo loại kèo cho hôm nay (giờ VN). */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { homNay, ds } = await tipHomNay("thang-hai-doi-ghi-ban");
  return metaTipNgay("thang-hai-doi-ghi-ban", homNay, ds.length, resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const { homNay, ds } = await tipHomNay("thang-hai-doi-ghi-ban");
  return <TrangTipNgay loai="thang-hai-doi-ghi-ban" homNay={homNay} ds={ds} lang={lang} />;
}
