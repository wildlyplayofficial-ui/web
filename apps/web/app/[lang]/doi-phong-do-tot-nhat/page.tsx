import type { Metadata } from "next";
import { doiPhongDo, metaDoiPhongDo, TrangDoiPhongDo } from "@/components/trang-doi-phong-do";
import { resolveLang } from "@/lib/i18n";

/** Đội phong độ tốt nhất trong 7 ngày tới, từ điểm phong độ chung và 10 trận gần nhất của tệp tuần. */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ds = await doiPhongDo();
  return metaDoiPhongDo(ds.length, resolveLang((await params).lang));
}

export default async function Trang({ params }: Props) {
  const lang = resolveLang((await params).lang);
  return <TrangDoiPhongDo ds={await doiPhongDo()} lang={lang} />;
}
