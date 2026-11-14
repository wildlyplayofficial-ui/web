import type { Metadata } from "next";
import { metaTipGiai, TrangTipGiai } from "@/components/trang-tip-giai";
import { resolveLang } from "@/lib/i18n";

/** Tip theo giải, 7 ngày tới. Slug giải lấy từ GIAI_TRANG; slug lạ trả 404. */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string; giai: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, giai } = await params;
  return metaTipGiai("ty-so", giai, resolveLang(lang));
}

export default async function Trang({ params }: Props) {
  const { lang, giai } = await params;
  return <TrangTipGiai loai="ty-so" slug={giai} lang={resolveLang(lang)} />;
}
