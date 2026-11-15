import type { Metadata } from "next";
import { metaThongSo, TrangThongSo } from "@/components/thong-so/trang";
import { resolveLang } from "@/lib/i18n";

/** /thong-so — xG từng đội theo giải (Peter giao 15/11). Dữ liệu từ data/xg-doi.json, dựng tĩnh. */
export const dynamic = "force-static";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metaThongSo(resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  return <TrangThongSo lang={resolveLang((await params).lang)} />;
}
