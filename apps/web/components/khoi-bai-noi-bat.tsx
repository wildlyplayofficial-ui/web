import Link from "next/link";
import { withLang, type Lang } from "@/lib/i18n";
import { laBlogLichCaMua } from "@/lib/chi-muc";
import { SO_BLOG_MOI } from "@/components/khoi-trang-tru";

/**
 * Khối "Bài nổi bật" cuối trang chủ (16/11/2026). Google chỉ bò trang chủ mỗi ngày;
 * đo trang chủ 16/11: 29/37 bài /blog KHÔNG có link nào từ trang chủ (KhoiTrangTru
 * chỉ lấy 5 bài mới nhất + bài lịch, DaiDuDoanGiai lấy 4 bài) → nằm "Đã phát hiện,
 * chưa thu thập". Khối này nối link thường (<a href>, dựng phía server) tới đúng
 * phần blog còn lại, lấy từ dữ liệu, không ghi cứng đường dẫn bài.
 */

type Bai = { slug: string; title: string };

/** Chặn trên để khối không phình mãi khi kho blog lớn dần. */
const TOI_DA = 30;

export function KhoiBaiNoiBat({ lang, blogs }: { lang: Lang; blogs: Bai[] }) {
  // Cùng phép lọc với KhoiTrangTru: bỏ bài lịch (đã có link) và 5 bài mới nhất (đã có link).
  const conLai = blogs
    .filter((b) => !laBlogLichCaMua(b.slug))
    .slice(SO_BLOG_MOI, SO_BLOG_MOI + TOI_DA);
  if (conLai.length === 0) return null;

  return (
    <section className="pb-10" aria-labelledby="bai-noi-bat">
      <h2 id="bai-noi-bat" className="mb-4 font-display text-xl font-bold">
        Bài nổi bật
      </h2>
      <div className="rounded-card border border-line bg-card p-5">
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {conLai.map((b) => (
            <li key={b.slug} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <Link
                href={withLang(`/blog/${b.slug}`, lang)}
                prefetch={false}
                className="text-ink transition-colors hover:text-brand hover:underline"
              >
                {b.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
