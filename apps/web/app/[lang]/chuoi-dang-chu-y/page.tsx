import type { Metadata } from "next";
import { chuoiHomNay, metaChuoi, TrangChuoi } from "@/components/trang-chuoi";
import { resolveLang } from "@/lib/i18n";

/** Đội đang có chuỗi đáng chú ý (thắng · bất bại · Over/Under · hai đội ghi bàn…), từ dữ liệu 10 trận gần nhất. */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { homNay, ds } = await chuoiHomNay();
  return metaChuoi(homNay, new Set(ds.map((d) => d.doi)).size, resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  const { homNay, ds } = await chuoiHomNay();
  return <TrangChuoi homNay={homNay} ds={ds} lang={lang} />;
}
