import type { Metadata } from "next";
import { resolveLang } from "@/lib/i18n";
import { MatchesView, metadataTrang } from "./view";

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataTrang(resolveLang((await params).lang), {});
}

export default async function Page({ params }: Props) {
  return <MatchesView lang={resolveLang((await params).lang)} sp={{}} />;
}
