import type { Metadata } from "next";
import { resolveLang } from "@/lib/i18n";
import { metadataLich2027, TrangLich2027 } from "@/components/trang-lich-2027";
import { DU_LIEU } from "@/lib/chung-ket-c1-2027";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadataLich2027(DU_LIEU, resolveLang((await params).lang));
}

export default function ChungKetC12027({ params }: Props) {
  return <TrangLich2027 d={DU_LIEU} params={params} />;
}
