import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { metaThongSoGiai, TrangThongSoGiai } from "@/components/thong-so/trang";
import { resolveLang } from "@/lib/i18n";
import { HUB_GIAI } from "@/lib/duong-hub-giai";
import { giaiXgTuSlug, tepXgDoi } from "@/lib/xg-doi";

/** /thong-so/{giai} — slug giống /du-doan/{giai}; dựng sẵn giải trong data/xg-doi.json CHƯA có hub
 *  /competitions (16/11 gộp trang giải: 5 giải lớn 301 về hub ở next.config.ts). */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return tepXgDoi().giai.filter((g) => !HUB_GIAI[g.slug]).map((g) => ({ giai: g.slug }));
}

type Props = { params: Promise<{ lang: string; giai: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, giai } = await params;
  const g = giaiXgTuSlug(giai);
  return g ? metaThongSoGiai(g, resolveLang(lang)) : {};
}

export default async function Trang({ params }: Props) {
  const { lang, giai } = await params;
  const g = giaiXgTuSlug(giai);
  if (!g) notFound();
  return <TrangThongSoGiai g={g} lang={resolveLang(lang)} />;
}
