import type { Metadata } from "next";
import { metaKeoXien, TrangKeoXien, xienCuaNgay } from "@/components/trang-keo-xien";
import { ngayVN } from "@/lib/du-doan-hang";
import { resolveLang } from "@/lib/i18n";

/** Kèo xiên hôm nay. Ngày khác: /keo-xien/[ngay]. */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const homNay = ngayVN(Date.now());
  return metaKeoXien(homNay, homNay, resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const homNay = ngayVN(Date.now());
  return <TrangKeoXien ngay={homNay} homNay={homNay} {...(await xienCuaNgay(homNay))} lang={lang} />;
}
