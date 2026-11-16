import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { metaFormGiai, TrangFormGiai } from "@/components/thong-so/trang-form";
import { resolveLang } from "@/lib/i18n";
import { giaiXgTuSlug, tepXgDoi } from "@/lib/xg-doi";

/** /form/{giai} — slug giống /du-doan/{giai}; dựng sẵn mọi giải có trong data/xg-doi.json. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return tepXgDoi().giai.map((g) => ({ giai: g.slug }));
}

type Props = { params: Promise<{ lang: string; giai: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, giai } = await params;
  const g = giaiXgTuSlug(giai);
  return g ? metaFormGiai(g, resolveLang(lang)) : {};
}

export default async function Trang({ params }: Props) {
  const { lang, giai } = await params;
  const g = giaiXgTuSlug(giai);
  if (!g) notFound();
  return <TrangFormGiai g={g} lang={resolveLang(lang)} />;
}
