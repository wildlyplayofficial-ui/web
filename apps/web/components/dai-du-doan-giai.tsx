import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { GIAI_TRANG } from "@/lib/du-doan-loc";
import { ScrollRow } from "@/components/scroll-row";

/**
 * Dải "Dự đoán theo giải & bài mới" trên trang chủ (12/11/2026) — THAY dải trận
 * HomeNextMatches. Dải cũ đẩy 11 link /match/{slug} (trang khuôn mỏng, tự noindex)
 * ra trang chủ — trang duy nhất Google còn giữ — nên Google bò vào đúng nhóm trang
 * không muốn index. Dải này trỏ sang trang giải /du-doan/{giai}, bài phân tích và
 * blog mới nhất: toàn trang có trong sitemap. Dữ liệu lấy từ những gì trang chủ
 * đã tải sẵn, không gọi thêm CSDL.
 */

type Bai = { slug: string; title: string };
type The = { href: string; nhan: string; ten: string };

const SO_BAI = 4;

export function DaiDuDoanGiai({ lang, baiMoi, blogMoi }: { lang: Lang; baiMoi: Bai[]; blogMoi: Bai[] }) {
  const the: The[] = [
    ...GIAI_TRANG.map((g) => ({ href: `/du-doan/${g.slug}`, nhan: "Dự đoán", ten: `Dự đoán ${g.ten}` })),
    ...baiMoi.slice(0, SO_BAI).map((b) => ({ href: `/analysis/${b.slug}`, nhan: "Phân tích", ten: b.title })),
    ...blogMoi.slice(0, SO_BAI).map((b) => ({ href: `/blog/${b.slug}`, nhan: "Blog", ten: b.title })),
  ];
  if (the.length === 0) return null;

  return (
    <section className="pb-10">
      <div className="rounded-card border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">Dự đoán theo giải &amp; bài mới</h2>
          <Link href={withLang("/du-doan", lang)} className="ml-auto text-sm font-semibold text-brand hover:underline">
            Tất cả dự đoán &rarr;
          </Link>
        </div>
        {/* Cuộn ngang trong khung riêng — mũi tên ‹ › vì scrollbar đã ẩn (Peter 9/8). */}
        <ScrollRow className="flex gap-3 px-5 py-4">
          {the.map((t) => (
            <Link
              key={t.href}
              href={withLang(t.href, lang)}
              prefetch={false}
              className="flex w-[200px] shrink-0 flex-col rounded-card border border-line px-4 py-3 transition-colors hover:border-line-hover hover:bg-card-hover"
            >
              <span className="font-display text-[11px] font-bold uppercase tracking-wide text-brand">{t.nhan}</span>
              <span className="mt-1.5 line-clamp-3 text-sm font-semibold leading-snug">{t.ten}</span>
            </Link>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
