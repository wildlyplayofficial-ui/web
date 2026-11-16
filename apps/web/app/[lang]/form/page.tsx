import type { Metadata } from "next";
import { metaForm, TrangForm } from "@/components/thong-so/trang-form";
import { resolveLang } from "@/lib/i18n";

/** /form — phong độ 5 trận gần nhất từng đội (Peter giao 15/11). Dữ liệu từ data/xg-doi.json, dựng tĩnh. */
export const dynamic = "force-static";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metaForm(resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  return <TrangForm lang={resolveLang((await params).lang)} />;
}
