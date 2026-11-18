import Link from "next/link";
import type { HangDuDoan } from "@/lib/du-doan-hang";
import { ngayThang } from "@/lib/du-doan-tran";
import { withLang, type Lang } from "@/lib/i18n";
import type { Post } from "@/lib/types";

/**
 * 18/11 (soi chỉ mục): khối link thường (<a href>) sát đầu trang chủ — Google chỉ bò trang chủ.
 * Dẫn thẳng tới /du-doan, từng trận hôm nay và 5 bài blog mới nhất.
 */
export function KhoiHomNayBlog({ rows, homNay, blogs, lang }: { rows: HangDuDoan[]; homNay: string; blogs: Post[]; lang: Lang }) {
  const homNayRows = rows.filter((r) => r.ngay === homNay && !(Date.parse(r.kickoffUtc) <= Date.now())) // 18/11: bỏ trận đã bắt đầu.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc)).slice(0, 8);
  const bai = blogs.slice(0, 5);
  return (
    <section aria-label="Dự đoán hôm nay và bài mới" className="mt-4 rounded-card border border-brand/40 bg-brand-dim/30 p-4">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-bold">
            <Link href={withLang("/du-doan", lang)} className="hover:underline">Dự đoán hôm nay {ngayThang(homNay)}</Link>
          </h2>
          {homNayRows.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {homNayRows.map((h) => (
                <li key={h.slug}>
                  <Link href={withLang(`/du-doan/${h.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">
                    {h.gio === "--:--" ? "" : `${h.gio} · `}{h.nha} vs {h.khach} ({h.giai})
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Trận hôm nay đã đá hết hoặc chưa lên dự đoán, xem các ngày tới ở trang dự đoán.</p>
          )}
          <Link href={withLang("/du-doan", lang)} className="mt-1 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Xem tất cả dự đoán →</Link>
        </div>
        {bai.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold">
              <Link href={withLang("/blog", lang)} className="hover:underline">Bài blog mới nhất</Link>
            </h2>
            <ul className="mt-2 space-y-0.5">
              {bai.map((b) => (
                <li key={b.slug}>
                  <Link href={withLang(`/blog/${b.slug}`, lang)} className="inline-flex min-h-11 items-center text-brand hover:underline">{b.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
