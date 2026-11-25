import type { Metadata } from "next";
import { resolveLang } from "@/lib/i18n";
import { NewsView, metadataTrang } from "./view";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTrang(resolveLang((await params).lang), {});
}

export default async function Page({ params }: Props) {
  return <NewsView lang={resolveLang((await params).lang)} sp={{}} />;
}
