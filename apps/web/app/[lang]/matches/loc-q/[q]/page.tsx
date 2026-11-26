import type { Metadata } from "next";
import { resolveLang } from "@/lib/i18n";
import { giaiMaQuery } from "@/lib/query-segment";
import { MatchesView, metadataTrang } from "../../view";

// Đích viết lại của proxy.ts cho `?query` — xem lib/query-segment.ts. Giữ revalidate = trang gốc.
export const revalidate = 300;

// Không dựng sẵn bản nào: mỗi tổ hợp query được ISR theo yêu cầu rồi cache (khai báo này để Next coi là SSG/ISR, không phải động).
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ lang: string; q: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, q } = await params;
  return metadataTrang(resolveLang(lang), giaiMaQuery(q));
}

export default async function Page({ params }: Props) {
  const { lang, q } = await params;
  return <MatchesView lang={resolveLang(lang)} sp={giaiMaQuery(q)} />;
}
